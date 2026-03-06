/**
 * TranslationService — AI subtitle translation via LibreTranslate (OSS, self-hosted).
 *
 * Config (env vars):
 *   TRANSLATION_TARGETS  comma-separated BCP-47 codes, e.g. "he,fr,de"  (empty = disabled)
 *   LIBRE_TRANSLATE_URL  base URL of LibreTranslate instance               (default: http://libretranslate:5000)
 *   LIBRE_TRANSLATE_KEY  API key (optional)
 *
 * Memory safety: no timers / subscriptions — stateless per-call service.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  createDatabaseConnection,
  schema,
  eq,
  closeAllPools,
} from '@edusphere/db';
import { minioConfig } from '@edusphere/config';
import { NatsService } from '../nats/nats.service';
import { generateWebVTT } from '../hls/vtt-generator';
import type { TranslationCompletedEvent } from './translation.types';

const LIBRE_URL =
  process.env.LIBRE_TRANSLATE_URL ?? 'http://libretranslate:5000';
const LIBRE_KEY = process.env.LIBRE_TRANSLATE_KEY ?? '';

@Injectable()
export class TranslationService implements OnModuleDestroy {
  private readonly logger = new Logger(TranslationService.name);
  private readonly db = createDatabaseConnection();
  private readonly s3: S3Client;
  private readonly bucket = minioConfig.bucket;

  constructor(private readonly natsService: NatsService) {
    this.s3 = new S3Client({
      endpoint: `http://${minioConfig.endpoint}:${minioConfig.port}`,
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

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** Returns configured target language codes. Empty array = translation disabled. */
  getTargetLanguages(): string[] {
    const targets = process.env.TRANSLATION_TARGETS ?? '';
    return targets
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  /** Translates a single text via LibreTranslate. Returns original on failure. */
  async translateText(
    text: string,
    source: string,
    target: string
  ): Promise<string> {
    try {
      const body: Record<string, string> = {
        q: text,
        source,
        target,
        format: 'text',
      };
      if (LIBRE_KEY) body.api_key = LIBRE_KEY;

      const res = await fetch(`${LIBRE_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        this.logger.warn(
          `LibreTranslate ${res.status} for ${source}→${target}`
        );
        return text;
      }
      const data = (await res.json()) as { translatedText?: string };
      return data.translatedText ?? text;
    } catch (err) {
      this.logger.warn(`translateText failed: ${source}→${target}`, err);
      return text;
    }
  }

  /**
   * Translates an existing transcript into all configured target languages.
   * Inserts translated transcript rows + segments, uploads VTT to MinIO, publishes event.
   * Non-blocking by design — caller must wrap in .catch().
   */
  async translateTranscript(
    transcriptId: string,
    assetId: string,
    courseId: string,
    tenantId: string,
    sourceLanguage: string
  ): Promise<void> {
    const targets = this.getTargetLanguages();
    if (targets.length === 0) return;

    // Load source segments
    const segments = await this.db
      .select()
      .from(schema.transcript_segments)
      .where(eq(schema.transcript_segments.transcript_id, transcriptId));

    const sourceTranscript = await this.db
      .select()
      .from(schema.transcripts)
      .where(eq(schema.transcripts.id, transcriptId))
      .limit(1);

    if (!sourceTranscript[0]) {
      this.logger.warn(
        `TranslationService: transcript ${transcriptId} not found`
      );
      return;
    }

    for (const target of targets) {
      if (target === sourceLanguage) continue;
      try {
        await this.translateToLanguage(
          transcriptId,
          assetId,
          courseId,
          tenantId,
          sourceLanguage,
          target,
          sourceTranscript[0].full_text,
          segments
        );
      } catch (err) {
        this.logger.error(
          `Translation failed for ${sourceLanguage}→${target}`,
          err
        );
      }
    }
  }

  private async translateToLanguage(
    sourceTranscriptId: string,
    assetId: string,
    courseId: string,
    tenantId: string,
    source: string,
    target: string,
    fullText: string,
    segments: (typeof schema.transcript_segments.$inferSelect)[]
  ): Promise<void> {
    // Translate full text
    const translatedFullText = await this.translateText(
      fullText,
      source,
      target
    );

    // Translate segments (sequential to respect rate limits)
    const translatedSegments = await Promise.all(
      segments.map(async (seg) => ({
        ...seg,
        text: await this.translateText(seg.text, source, target),
      }))
    );

    // Upsert translated transcript
    const [translatedTranscript] = await this.db
      .insert(schema.transcripts)
      .values({
        asset_id: assetId,
        language: target,
        full_text: translatedFullText,
      })
      .onConflictDoUpdate({
        target: [schema.transcripts.asset_id, schema.transcripts.language],
        set: { full_text: translatedFullText, updated_at: new Date() },
      })
      .returning();

    if (!translatedTranscript) {
      throw new Error(
        `Failed to upsert translated transcript ${assetId}/${target}`
      );
    }

    // Insert translated segments (delete existing first for idempotency)
    await this.db
      .delete(schema.transcript_segments)
      .where(
        eq(schema.transcript_segments.transcript_id, translatedTranscript.id)
      );

    if (translatedSegments.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < translatedSegments.length; i += BATCH) {
        await this.db.insert(schema.transcript_segments).values(
          translatedSegments.slice(i, i + BATCH).map((s) => ({
            transcript_id: translatedTranscript.id,
            start_time: s.start_time,
            end_time: s.end_time,
            text: s.text,
            speaker: s.speaker,
          }))
        );
      }
    }

    // Generate and upload VTT
    const vtt = generateWebVTT(
      translatedSegments.map((s) => ({
        start: parseFloat(String(s.start_time)),
        end: parseFloat(String(s.end_time)),
        text: s.text,
      }))
    );

    const vttKey = `${tenantId}/${courseId}/${assetId}/vtt/${target}.vtt`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: vttKey,
        Body: vtt,
        ContentType: 'text/vtt',
      })
    );

    // Store vtt_key on the translated transcript row
    await this.db
      .update(schema.transcripts)
      .set({ vtt_key: vttKey, updated_at: new Date() })
      .where(eq(schema.transcripts.id, translatedTranscript.id));

    // Publish completion event
    const event: TranslationCompletedEvent = {
      assetId,
      transcriptId: translatedTranscript.id,
      language: target,
      vttKey,
      tenantId,
    };
    await this.natsService.publish(
      'transcription.translation.completed',
      event as unknown as Record<string, unknown>
    );

    this.logger.log(
      `Translation complete: assetId=${assetId} ${source}→${target} vttKey=${vttKey}`
    );
  }
}
