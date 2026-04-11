/**
 * TranscriptReadyConsumer
 *
 * Listens on the `transcription.completed` NATS subject published by the
 * transcription-worker.  When a transcription finishes, this consumer looks
 * up the lesson linked to the media asset and calls
 * EnrichedLessonBlocksService.createBlocksFromSegments() to auto-generate
 * enriched transcript blocks.
 *
 * The operation is idempotent (uses onConflictDoNothing), so re-delivery is safe.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { createDatabaseConnection, schema, eq } from '@edusphere/db';
import { EnrichedLessonBlocksService } from './enriched-lesson-blocks.service';

const SUBJECT = 'transcription.completed';
const QUEUE_GROUP = 'enriched-lesson-blocks';

interface TranscriptionCompletedPayload {
  assetId: string;
  tenantId: string;
  courseId?: string;
  transcriptId?: string;
  segmentCount?: number;
}

function isValidPayload(obj: unknown): obj is TranscriptionCompletedPayload {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o['assetId'] === 'string' && typeof o['tenantId'] === 'string';
}

@Injectable()
export class TranscriptReadyConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TranscriptReadyConsumer.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;

  constructor(private readonly blocksService: EnrichedLessonBlocksService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      this.sub = this.nc.subscribe(SUBJECT, { queue: QUEUE_GROUP });
      this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);
      void this.processMessages();
    } catch (err) {
      this.logger.error({ err }, `Failed to subscribe to ${SUBJECT}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.sub?.unsubscribe();
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
  }

  private async processMessages(): Promise<void> {
    if (!this.sub) return;

    for await (const msg of this.sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as unknown;
        if (!isValidPayload(raw)) {
          this.logger.warn('Received malformed transcription.completed payload');
          continue;
        }
        await this.handleTranscriptionCompleted(raw);
      } catch (err) {
        this.logger.error({ err }, 'Error processing transcription.completed message');
      }
    }
  }

  private async handleTranscriptionCompleted(
    payload: TranscriptionCompletedPayload
  ): Promise<void> {
    const { assetId, tenantId } = payload;

    // Find lesson_id linked to this media asset
    const lessonId = await this.findLessonByAsset(assetId);
    if (!lessonId) {
      this.logger.debug(
        `No lesson linked to assetId=${assetId} — skipping block generation`
      );
      return;
    }

    this.logger.log(
      `Auto-generating enriched blocks: lessonId=${lessonId} assetId=${assetId}`
    );

    await this.blocksService.createBlocksFromSegments(lessonId, {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    });
  }

  /** Look up lesson_id via lesson_assets → media_assets join. */
  private async findLessonByAsset(assetId: string): Promise<string | null> {
    const rows = await this.db
      .select({ lessonId: schema.lesson_assets.lesson_id })
      .from(schema.lesson_assets)
      .innerJoin(
        schema.media_assets,
        eq(schema.lesson_assets.media_asset_id, schema.media_assets.id)
      )
      .where(eq(schema.media_assets.id, assetId))
      .limit(1);

    return rows[0]?.lessonId ?? null;
  }
}
