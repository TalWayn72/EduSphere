/**
 * PolishingConsumer
 *
 * NATS consumer for `EDUSPHERE.jargon.detection.completed`.
 * Triggers the transcript polishing pipeline for each lesson that completes
 * jargon detection.
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

const SUBJECT = 'EDUSPHERE.jargon.detection.completed';
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

type JargonCompletedMsg = z.infer<typeof JargonCompletedSchema>;

@Injectable()
export class PolishingConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PolishingConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(
    private readonly orchestrator: PolishingOrchestratorService,
    private readonly nats: NatsService,
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
        'Failed to connect to NATS — polishing consumer inactive',
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

    const sub = this.connection.subscribe(SUBJECT, {
      queue: QUEUE_GROUP,
    });
    this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);

    (async () => {
      for await (const msg of sub) {
        try {
          const raw = this.sc.decode(msg.data);
          const parsed = JSON.parse(raw) as unknown;

          if (!isJargonDetectionCompleted(parsed)) {
            this.logger.warn('Received malformed jargon.detection.completed');
            continue;
          }

          const payload = JargonCompletedSchema.parse(parsed);
          await this.handleJargonCompleted(payload);
        } catch (err) {
          this.logger.error(
            { err },
            `Failed to handle ${SUBJECT}`,
          );
        }
      }
    })().catch((err) => {
      this.logger.error({ err }, 'Polishing consumer subscription loop crashed');
    });
  }

  private async handleJargonCompleted(
    payload: JargonCompletedMsg,
  ): Promise<void> {
    const { lessonId, tenantId } = payload;
    this.logger.log({ lessonId }, 'Starting transcript polishing');

    try {
      await this.nats.publish(POLISHING_EVENTS.STARTED, {
        lessonId,
        tenantId,
        timestamp: new Date().toISOString(),
      });

      await this.orchestrator.startPolishing(lessonId, tenantId);
    } catch (err) {
      this.logger.error({ err, lessonId }, 'Polishing pipeline failed');
      await this.nats.publish(POLISHING_EVENTS.FAILED, {
        lessonId,
        tenantId,
        errorMessage: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      });
    }
  }
}
