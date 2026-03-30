import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createDatabaseConnection, schema, eq } from '@edusphere/db';
import { minioConfig } from '@edusphere/config';
import { ConceptExtractor } from '../knowledge/concept-extractor';
import { GraphBuilder } from '../knowledge/graph-builder';
import { formatToWebVTT } from '../webvtt-formatter';

/**
 * Helpers for the transcription pipeline: VTT upload, concept extraction,
 * asset status updates, and DB persistence.
 *
 * Extracted from TranscriptionService to keep each file under 300 lines.
 */
@Injectable()
export class TranscriptionHelpersService {
  private readonly logger = new Logger(TranscriptionHelpersService.name);
  private readonly db = createDatabaseConnection();
  private readonly s3: S3Client;
  private readonly bucket = minioConfig.bucket;

  constructor(
    private readonly conceptExtractor: ConceptExtractor,
    private readonly graphBuilder: GraphBuilder
  ) {
    this.s3 = new S3Client({
      endpoint: minioConfig.endpoint,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async extractAndPublishConcepts(
    fullText: string,
    courseId: string,
    tenantId: string
  ): Promise<void> {
    const concepts = await this.conceptExtractor.extract(
      fullText,
      courseId,
      tenantId
    );
    await this.graphBuilder.publishConcepts(concepts, courseId, tenantId);
  }

  async persistTranscript(
    assetId: string,
    fullText: string,
    language: string,
    segments: Array<{
      start: number;
      end: number;
      text: string;
      speaker?: string;
    }>
  ): Promise<{ transcriptId: string; segmentIds: string[] }> {
    const [transcript] = await this.db
      .insert(schema.transcripts)
      .values({ asset_id: assetId, language, full_text: fullText })
      .returning();

    if (!transcript) {
      throw new Error('Failed to insert transcript row');
    }

    const segmentIds: string[] = [];

    if (segments.length > 0) {
      const segmentRows = segments.map((s) => ({
        transcript_id: transcript.id,
        start_time: String(s.start),
        end_time: String(s.end),
        text: s.text,
        speaker: s.speaker ?? null,
      }));

      const BATCH = 100;
      for (let i = 0; i < segmentRows.length; i += BATCH) {
        const inserted = await this.db
          .insert(schema.transcript_segments)
          .values(segmentRows.slice(i, i + BATCH))
          .returning({ id: schema.transcript_segments.id });
        segmentIds.push(...inserted.map((r) => r.id));
      }
    }

    return { transcriptId: transcript.id, segmentIds };
  }

  async updateAssetStatus(
    assetId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  ): Promise<void> {
    await this.db
      .update(schema.media_assets)
      .set({ transcription_status: status, updated_at: new Date() })
      .where(eq(schema.media_assets.id, assetId));
  }

  async uploadVtt(
    assetId: string,
    courseId: string,
    tenantId: string,
    transcriptId: string,
    language: string,
    segments: Array<{ start: number; end: number; text: string }>
  ): Promise<void> {
    try {
      const vtt = formatToWebVTT(segments);
      const vttKey = `captions/${tenantId}/${courseId}/${assetId}/${language}.vtt`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: vttKey,
          Body: vtt,
          ContentType: 'text/vtt',
        })
      );

      await this.db
        .update(schema.transcripts)
        .set({ vtt_key: vttKey, updated_at: new Date() })
        .where(eq(schema.transcripts.id, transcriptId));

      this.logger.log(
        `VTT uploaded: assetId=${assetId} language=${language} key=${vttKey}`
      );
    } catch (err) {
      this.logger.error(
        { err, assetId, language },
        'VTT upload failed (non-fatal) — captions will be unavailable for this asset'
      );
    }
  }

  async updateAssetHlsManifest(
    assetId: string,
    manifestKey: string
  ): Promise<void> {
    await this.db
      .update(schema.media_assets)
      .set({ hls_manifest_key: manifestKey, updated_at: new Date() })
      .where(eq(schema.media_assets.id, assetId));
  }
}
