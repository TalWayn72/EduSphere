import { Injectable, Logger } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { createDatabaseConnection, schema, eq } from '@edusphere/db';
import type {
  MediaUploadedEvent,
  TranscriptionCompletedEvent,
  TranscriptionFailedEvent,
} from './transcription.types';
import type { EmbeddingRequestedEvent } from '../embedding/embedding.worker';
import { WhisperClient } from './whisper.client';
import { MinioClient } from './minio.client';
import { NatsService } from '../nats/nats.service';
import { ConceptExtractor } from '../knowledge/concept-extractor';
import { GraphBuilder } from '../knowledge/graph-builder';
import { HlsService } from '../hls/hls.service';

/**
 * Core transcription orchestrator.
 *
 * Flow:
 *   1. Download media file from MinIO to temp path
 *   2. Call Whisper (OpenAI or local) to get segments
 *   3. Insert transcript + segments into DB via Drizzle
 *   4. Update media_assets.transcription_status
 *   5. Publish transcription.completed / transcription.failed to NATS
 *   6. Clean up temp file
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly whisper: WhisperClient,
    private readonly minio: MinioClient,
    private readonly natsService: NatsService,
    private readonly conceptExtractor: ConceptExtractor,
    private readonly graphBuilder: GraphBuilder,
    private readonly hlsService: HlsService,
  ) {}

  async transcribeFile(event: MediaUploadedEvent): Promise<void> {
    const { fileKey, assetId, courseId, tenantId } = event;
    this.logger.log(`Starting transcription: assetId=${assetId} fileKey=${fileKey}`);

    let tempPath: string | null = null;

    try {
      // Step 1: Mark as PROCESSING
      await this.updateAssetStatus(assetId, 'PROCESSING');

      // Step 2: Download from MinIO
      tempPath = await this.minio.downloadToTemp(fileKey);

      // Step 3: Transcribe via Whisper
      const result = await this.whisper.transcribe(tempPath);
      this.logger.log(
        `Whisper done: ${result.segments.length} segments, lang=${result.language ?? 'unknown'}`
      );

      // Step 4: Persist transcript + segments, get back segment IDs
      const { transcriptId, segmentIds } = await this.persistTranscript(
        assetId,
        result.text,
        result.language ?? 'en',
        result.segments,
      );

      // Step 5: Mark as COMPLETED
      await this.updateAssetStatus(assetId, 'COMPLETED');

      // Step 6: Publish success event
      const completedEvent: TranscriptionCompletedEvent = {
        assetId,
        courseId,
        tenantId,
        transcriptId,
        segmentCount: result.segments.length,
        language: result.language ?? 'en',
      };
      await this.natsService.publish('transcription.completed', completedEvent as any);
      this.logger.log(`Transcription completed: assetId=${assetId} transcriptId=${transcriptId}`);

      // Step 7: Request embedding generation for all segments
      if (segmentIds.length > 0) {
        const embeddingEvent: EmbeddingRequestedEvent = {
          transcriptId,
          segmentIds,
          tenantId,
        };
        await this.natsService.publish(
          'transcription.embedding.requested',
          embeddingEvent as unknown as Record<string, unknown>
        );
        this.logger.log(
          `Embedding requested: transcriptId=${transcriptId} segments=${segmentIds.length}`
        );
      }

      // Step 8: Extract concepts and publish to knowledge graph pipeline
      // Non-blocking: errors here must not fail the transcription job.
      this.extractAndPublishConcepts(result.text, courseId, tenantId).catch(
        (err) => this.logger.error({ err, assetId }, 'Concept pipeline error (non-fatal)')
      );

      // Step 9: HLS transcode (non-blocking, fire-and-forget)
      // Failure here must NOT affect the transcription result.
      this.hlsService
        .transcodeToHls(fileKey, `${tenantId}/${courseId}/${assetId}/hls`)
        .then(async (hlsResult) => {
          if (!hlsResult) return; // non-video asset — skipped silently
          this.logger.log(
            `HLS transcode complete: assetId=${assetId} manifest=${hlsResult.manifestKey}`,
          );
          await this.updateAssetHlsManifest(assetId, hlsResult.manifestKey);
        })
        .catch((err) =>
          this.logger.error(
            { err, assetId },
            'HLS transcode failed (non-fatal)',
          ),
        );
    } catch (err) {
      this.logger.error(`Transcription failed for assetId=${assetId}`, err);
      await this.updateAssetStatus(assetId, 'FAILED').catch(() => undefined);

      const failedEvent: TranscriptionFailedEvent = {
        assetId,
        courseId,
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      };
      await this.natsService.publish('transcription.failed', failedEvent as any);
    } finally {
      // Step 7: Clean up temp file
      if (tempPath) {
        await unlink(tempPath).catch((e) =>
          this.logger.warn(`Failed to delete temp file ${tempPath}`, e)
        );
      }
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async extractAndPublishConcepts(
    fullText: string,
    courseId: string,
    tenantId: string
  ): Promise<void> {
    const concepts = await this.conceptExtractor.extract(fullText, courseId, tenantId);
    await this.graphBuilder.publishConcepts(concepts, courseId, tenantId);
  }

  private async persistTranscript(
    assetId: string,
    fullText: string,
    language: string,
    segments: Array<{ start: number; end: number; text: string; speaker?: string }>,
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

      // Insert in batches of 100 to stay within DB limits, collect IDs
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

  private async updateAssetStatus(
    assetId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
  ): Promise<void> {
    await this.db
      .update(schema.media_assets)
      .set({ transcription_status: status, updated_at: new Date() })
      .where(eq(schema.media_assets.id, assetId));
  }

  private async updateAssetHlsManifest(
    assetId: string,
    manifestKey: string,
  ): Promise<void> {
    await this.db
      .update(schema.media_assets)
      .set({ hls_manifest_key: manifestKey, updated_at: new Date() })
      .where(eq(schema.media_assets.id, assetId));
  }
}
