import { Injectable, Logger } from '@nestjs/common';
import { unlink } from 'fs/promises';
import type {
  MediaUploadedEvent,
  TranscriptionCompletedEvent,
  TranscriptionFailedEvent,
} from './transcription.types';
import type { EmbeddingRequestedEvent } from '../embedding/embedding.worker';
import { WhisperClient } from './whisper.client';
import { MinioClient } from './minio.client';
import { NatsService } from '../nats/nats.service';
import { HlsService } from '../hls/hls.service';
import { TranslationService } from '../translation/translation.service';
import { TranscriptionHelpersService } from './transcription-helpers.service';

/**
 * Core transcription orchestrator.
 *
 * Flow:
 *   1. Download media file from MinIO to temp path
 *   2. Call Whisper to get segments
 *   3. Persist transcript + segments via TranscriptionHelpersService
 *   4. Update media_assets.transcription_status
 *   5. Publish transcription.completed / transcription.failed to NATS
 *   6. Clean up temp file
 *   7-10. Non-blocking: embeddings, translation, concepts, HLS transcode
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    private readonly whisper: WhisperClient,
    private readonly minio: MinioClient,
    private readonly natsService: NatsService,
    private readonly hlsService: HlsService,
    private readonly translationService: TranslationService,
    private readonly helpers: TranscriptionHelpersService
  ) {}

  async transcribeFile(event: MediaUploadedEvent): Promise<void> {
    const { fileKey, assetId, courseId, tenantId } = event;
    this.logger.log(
      `Starting transcription: assetId=${assetId} fileKey=${fileKey}`
    );

    let tempPath: string | null = null;

    try {
      await this.helpers.updateAssetStatus(assetId, 'PROCESSING');

      tempPath = await this.minio.downloadToTemp(fileKey);

      const result = await this.whisper.transcribe(tempPath);
      this.logger.log(
        `Whisper done: ${result.segments.length} segments, lang=${result.language ?? 'unknown'}`
      );

      const { transcriptId, segmentIds } = await this.helpers.persistTranscript(
        assetId,
        result.text,
        result.language ?? 'en',
        result.segments
      );

      await this.helpers.uploadVtt(
        assetId,
        courseId,
        tenantId,
        transcriptId,
        result.language ?? 'en',
        result.segments
      );

      await this.helpers.updateAssetStatus(assetId, 'COMPLETED');

      const completedEvent: TranscriptionCompletedEvent = {
        assetId,
        courseId,
        tenantId,
        transcriptId,
        segmentCount: result.segments.length,
        language: result.language ?? 'en',
      };
      await this.natsService.publish(
        'transcription.completed',
        completedEvent as unknown as Record<string, unknown>
      );
      this.logger.log(
        `Transcription completed: assetId=${assetId} transcriptId=${transcriptId}`
      );

      this.requestEmbeddings(transcriptId, segmentIds, tenantId);
      this.requestTranslation(
        transcriptId,
        assetId,
        courseId,
        tenantId,
        result.language ?? 'en'
      );
      this.requestConceptExtraction(result.text, courseId, tenantId, assetId);
      this.requestHlsTranscode(fileKey, tenantId, courseId, assetId);
    } catch (err) {
      this.logger.error(`Transcription failed for assetId=${assetId}`, err);
      await this.helpers
        .updateAssetStatus(assetId, 'FAILED')
        .catch(() => undefined);

      const failedEvent: TranscriptionFailedEvent = {
        assetId,
        courseId,
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      };
      await this.natsService.publish(
        'transcription.failed',
        failedEvent as unknown as Record<string, unknown>
      );
    } finally {
      if (tempPath) {
        await unlink(tempPath).catch((e) =>
          this.logger.warn(`Failed to delete temp file ${tempPath}`, e)
        );
      }
    }
  }

  // ─── Non-blocking fire-and-forget steps ─────────────────────────────────

  private requestEmbeddings(
    transcriptId: string,
    segmentIds: string[],
    tenantId: string
  ): void {
    if (segmentIds.length === 0) return;
    const embeddingEvent: EmbeddingRequestedEvent = {
      transcriptId,
      segmentIds,
      tenantId,
    };
    this.natsService
      .publish(
        'transcription.embedding.requested',
        embeddingEvent as unknown as Record<string, unknown>
      )
      .then(() =>
        this.logger.log(
          `Embedding requested: transcriptId=${transcriptId} segments=${segmentIds.length}`
        )
      )
      .catch((err) =>
        this.logger.error({ err }, 'Embedding request failed (non-fatal)')
      );
  }

  private requestTranslation(
    transcriptId: string,
    assetId: string,
    courseId: string,
    tenantId: string,
    language: string
  ): void {
    this.translationService
      .translateTranscript(transcriptId, assetId, courseId, tenantId, language)
      .catch((err) =>
        this.logger.error(
          { err, assetId },
          'Subtitle translation error (non-fatal)'
        )
      );
  }

  private requestConceptExtraction(
    fullText: string,
    courseId: string,
    tenantId: string,
    assetId: string
  ): void {
    this.helpers
      .extractAndPublishConcepts(fullText, courseId, tenantId)
      .catch((err) =>
        this.logger.error(
          { err, assetId },
          'Concept pipeline error (non-fatal)'
        )
      );
  }

  private requestHlsTranscode(
    fileKey: string,
    tenantId: string,
    courseId: string,
    assetId: string
  ): void {
    this.hlsService
      .transcodeToHls(fileKey, `${tenantId}/${courseId}/${assetId}/hls`)
      .then(async (hlsResult) => {
        if (!hlsResult) return;
        this.logger.log(
          `HLS transcode complete: assetId=${assetId} manifest=${hlsResult.manifestKey}`
        );
        await this.helpers.updateAssetHlsManifest(
          assetId,
          hlsResult.manifestKey
        );
      })
      .catch((err) =>
        this.logger.error({ err, assetId }, 'HLS transcode failed (non-fatal)')
      );
  }
}
