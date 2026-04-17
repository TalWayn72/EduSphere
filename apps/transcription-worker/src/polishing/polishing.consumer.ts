/**
 * PolishingConsumer
 *
 * NATS consumer for two subjects:
 *  1. `EDUSPHERE.jargon.detection.completed` — automatic pipeline trigger after
 *     jargon detection finishes (worker-to-worker handoff).
 *  2. `EDUSPHERE.polishing.started` — manual trigger published by the
 *     `regeneratePolishedTranscript` mutation when an instructor clicks
 *     "Start AI Polishing". The DB record is already created; we receive its id.
 *
 * Follows the pattern established in jargon-post-processor.consumer.ts:
 * direct NATS connection with queue group for horizontal scaling.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, NatsConnection, StringCodec } from 'nats';
import { z } from 'zod';
import { NatsService } from '../nats/nats.service';
import { PolishingOrchestratorService } from './polishing.orchestrator';
import {
  POLISHING_EVENTS,
  isJargonDetectionCompleted,
} from './polishing.events';

const JARGON_SUBJECT = 'EDUSPHERE.jargon.detection.completed';
const POLISHING_STARTED_SUBJECT = 'EDUSPHERE.polishing.started';
const QUEUE_GROUP = 'polishing-workers';

const JargonCompletedSchema = z.object({
  lessonId: z.string().uuid(),
  tenantId: z.string().uuid(),
  transcriptId: z.string().uuid(),
  domainCount: z.number().int().nonnegative(),
  occurrenceCount: z.number().int().nonnegative(),
  correctedSegmentCount: z.number().int().nonnegative(),
  timestamp: z.string(),
});

const PolishingStartedSchema = z.object({
  lessonId: z.string().uuid(),
  tenantId: z.string().uuid(),
  polishedTranscriptId: z.string().uuid(),
  timestamp: z.string(),
});

type JargonCompletedMsg = z.infer<typeof JargonCompletedSchema>;
type PolishingStartedMsg = z.infer<typeof PolishingStartedSchema>;

@Injectable()
export class PolishingConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PolishingConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(
    private readonly orchestrator: PolishingOrchestratorService,
    private readonly nats: NatsService
  ) {}

  async onModuleInit(): Promise<void> {
    const natsUrl = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    try {
      this.connection = await connect({ servers: natsUrl });
      this.logger.log('PolishingConsumer connected to NATS');
      await this.startConsuming();
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to connect to NATS — polishing consumer inactive'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.drain();
      this.logger.log('NATS connection drained (polishing consumer)');
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async startConsuming(): Promise<void> {
    if (!this.connection) return;
    await Promise.all([
      this.subscribeJargonCompleted(),
      this.subscribePolishingStarted(),
    ]);
  }

  private async subscribeJargonCompleted(): Promise<void> {
    if (!this.connection) return;
    const sub = this.connection.subscribe(JARGON_SUBJECT, {
      queue: QUEUE_GROUP,
    });
    this.logger.log(
      `Subscribed to ${JARGON_SUBJECT} (queue: ${QUEUE_GROUP})`
    );
    void (async () => {
      for await (const msg of sub) {
        try {
          const parsed = JSON.parse(this.sc.decode(msg.data)) as unknown;
          if (!isJargonDetectionCompleted(parsed)) {
            this.logger.warn('Received malformed jargon.detection.completed');
            continue;
          }
          const payload = JargonCompletedSchema.parse(parsed);
          await this.handleJargonCompleted(payload);
        } catch (err) {
          this.logger.error({ err }, `Failed to handle ${JARGON_SUBJECT}`);
        }
      }
    })();
  }

  private async subscribePolishingStarted(): Promise<void> {
    if (!this.connection) return;
    const sub = this.connection.subscribe(POLISHING_STARTED_SUBJECT, {
      queue: QUEUE_GROUP,
    });
    this.logger.log(
      `Subscribed to ${POLISHING_STARTED_SUBJECT} (queue: ${QUEUE_GROUP})`
    );
    void (async () => {
      for await (const msg of sub) {
        try {
          const parsed = JSON.parse(this.sc.decode(msg.data)) as unknown;
          const result = PolishingStartedSchema.safeParse(parsed);
          if (!result.success) {
            this.logger.warn(
              { issues: result.error.issues },
              'Received malformed polishing.started payload'
            );
            continue;
          }
          await this.handlePolishingStarted(result.data);
        } catch (err) {
          this.logger.error(
            { err },
            `Failed to handle ${POLISHING_STARTED_SUBJECT}`
          );
        }
      }
    })();
  }

  private async handleJargonCompleted(
    payload: JargonCompletedMsg
  ): Promise<void> {
    const { lessonId, tenantId } = payload;
    this.logger.log({ lessonId }, 'Starting transcript polishing (auto)');

    try {
      await this.nats.publish(POLISHING_EVENTS.STARTED, {
        lessonId,
        tenantId,
        timestamp: new Date().toISOString(),
      });

      await this.orchestrator.startPolishing(lessonId, tenantId);
    } catch (err) {
      this.logger.error({ err, lessonId }, 'Polishing pipeline failed (auto)');
      await this.nats.publish(POLISHING_EVENTS.FAILED, {
        lessonId,
        tenantId,
        errorMessage: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handlePolishingStarted(
    payload: PolishingStartedMsg
  ): Promise<void> {
    const { lessonId, tenantId, polishedTranscriptId } = payload;
    this.logger.log(
      { lessonId, polishedTranscriptId },
      'Starting transcript polishing (manual regenerate)'
    );

    try {
      await this.orchestrator.resumePolishing(
        lessonId,
        tenantId,
        polishedTranscriptId
      );
    } catch (err) {
      this.logger.error(
        { err, lessonId, polishedTranscriptId },
        'Polishing pipeline failed (manual)'
      );
      await this.nats.publish(POLISHING_EVENTS.FAILED, {
        lessonId,
        tenantId,
        polishedTranscriptId,
        errorMessage: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }
  }
}
