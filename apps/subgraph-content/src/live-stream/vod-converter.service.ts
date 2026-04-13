/**
 * VodConverterService — Converts a live session recording into a VOD lesson.
 *
 * Listens for `EDUSPHERE.live.stream.ended`, then orchestrates:
 *  1. Create media_asset (VIDEO, PENDING transcription)
 *  2. Create/update lesson_asset linking media to the lesson
 *  3. Publish EDUSPHERE.live.recording.ready (triggers transcription pipeline)
 *  4. Seed live_transcript_segments as transcript for the Whisper pass
 *  5. Convert live_bookmarks → annotations (PERSONAL layer)
 *  6. Update live session status ENDED → RECORDING
 *  7. Publish EDUSPHERE.live.vod.conversion.done
 *
 * All DB work delegates to vod-converter.helpers.ts.
 * Errors are logged but never crash the process.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
} from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  createMediaAsset,
  upsertLessonAsset,
  seedTranscriptFromLive,
  migrateBookmarks,
} from './vod-converter.helpers';

// ─── NATS Subjects ────────────────────────────────────────────────────────────

const S = {
  STREAM_ENDED: 'EDUSPHERE.live.stream.ended',
  RECORDING_READY: 'EDUSPHERE.live.recording.ready',
  VOD_STARTED: 'EDUSPHERE.live.vod.conversion.started',
  VOD_DONE: 'EDUSPHERE.live.vod.conversion.done',
} as const;

const QUEUE_GROUP = 'vod-converter';

interface StreamEndedPayload {
  sessionId: string;
  tenantId: string;
  instructorId: string;
  timestamp: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VodConverterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VodConverterService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private connection: NatsConnection | null = null;

  async onModuleInit(): Promise<void> {
    if (!process.env['NATS_URL']) {
      this.logger.warn('NATS_URL not set — VodConverterService inactive');
      return;
    }
    try {
      this.connection = await connect(buildNatsOptions());
      this.logger.log('VodConverterService connected to NATS');
      this.startConsuming();
    } catch (err) {
      this.logger.error({ err }, 'Failed to connect — VOD converter inactive');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.drain();
      this.logger.log('VodConverterService NATS connection drained');
    }
    await closeAllPools();
  }

  // ─── Consumer loop ──────────────────────────────────────────────────────────

  private startConsuming(): void {
    if (!this.connection) return;
    const sub = this.connection.subscribe(S.STREAM_ENDED, { queue: QUEUE_GROUP });
    this.logger.log(`Subscribed to ${S.STREAM_ENDED} (queue: ${QUEUE_GROUP})`);

    (async () => {
      for await (const msg of sub) {
        try {
          const payload = JSON.parse(this.sc.decode(msg.data)) as StreamEndedPayload;
          await this.handleStreamEnded(payload);
        } catch (err) {
          this.logger.error({ err }, 'Failed to handle stream.ended message');
        }
      }
    })().catch((err) => {
      this.logger.error({ err }, 'VodConverterService subscription loop crashed');
    });
  }

  // ─── Main handler ──────────────────────────────────────────────────────────

  private async handleStreamEnded(payload: StreamEndedPayload): Promise<void> {
    const { sessionId, tenantId, instructorId } = payload;
    this.logger.log({ sessionId, tenantId }, 'VOD conversion started');
    void this.publish(S.VOD_STARTED, { sessionId, tenantId, timestamp: new Date().toISOString() });

    try {
      const cfg = await this.fetchConfig(sessionId, tenantId);
      if (!cfg) {
        this.logger.warn({ sessionId }, 'No live_session_config found — skipping');
        return;
      }

      const assetId = await createMediaAsset(
        this.db, tenantId, cfg.lesson_id, cfg.recording_key, sessionId
      );

      if (cfg.lesson_id) {
        await upsertLessonAsset(this.db, cfg.lesson_id, assetId, cfg.recording_key);
      }

      void this.publish(S.RECORDING_READY, {
        sessionId, tenantId, assetId,
        fileKey: cfg.recording_key ?? '',
        lessonId: cfg.lesson_id ?? null,
        timestamp: new Date().toISOString(),
      });

      await seedTranscriptFromLive(this.db, tenantId, instructorId, sessionId, assetId);
      await migrateBookmarks(this.db, tenantId, instructorId, sessionId, assetId);

      await this.db
        .update(schema.liveSessions)
        .set({ status: 'RECORDING' })
        .where(eq(schema.liveSessions.id, sessionId));

      void this.publish(S.VOD_DONE, {
        sessionId, tenantId, assetId,
        lessonId: cfg.lesson_id ?? null,
        timestamp: new Date().toISOString(),
      });

      this.logger.log({ sessionId, assetId }, 'VOD conversion completed');
    } catch (err) {
      this.logger.error({ err, sessionId }, 'VOD conversion failed');
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async fetchConfig(sessionId: string, tenantId: string) {
    const [cfg] = await this.db
      .select()
      .from(schema.live_session_configs)
      .where(
        and(
          eq(schema.live_session_configs.session_id, sessionId),
          eq(schema.live_session_configs.tenant_id, tenantId)
        )
      )
      .limit(1);
    return cfg ?? null;
  }

  private async publish(subject: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.connection) return;
    try {
      this.connection.publish(subject, this.sc.encode(JSON.stringify(payload)));
    } catch (err) {
      this.logger.warn({ err }, `Failed to publish to ${subject}`);
    }
  }
}
