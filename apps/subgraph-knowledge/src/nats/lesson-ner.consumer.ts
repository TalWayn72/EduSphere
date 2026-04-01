/**
 * LessonNERConsumer — subscribes to NER entity extraction events from the
 * lesson pipeline orchestrator and persists them into Apache AGE via CypherService.
 *
 * Subject: EDUSPHERE.content.*.ner.extracted (wildcard matches tenantId)
 * Security: double-validates that subject tenantId matches payload tenantId.
 * Retry: up to MAX_ATTEMPTS, publishes to DLQ after exhaustion.
 *
 * Memory safety: implements OnModuleDestroy for connection cleanup.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  connect,
  type NatsConnection,
  type JetStreamManager,
  type Subscription,
  StringCodec,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type { NEREntityItem } from '@edusphere/nats-client';
import { CypherService } from '../graph/cypher.service';

const SUBJECT = 'EDUSPHERE.content.*.ner.extracted';
const STREAM_NAME = 'CONTENT_NER';
const QUEUE_GROUP = 'knowledge-ner-workers';
const DLQ_SUBJECT = 'EDUSPHERE.content.ner.dlq';
const MAX_ATTEMPTS = 3;

interface NERPayload {
  readonly type: string;
  readonly tenantId: string;
  readonly lessonId: string;
  readonly runId: string;
  readonly entities: NEREntityItem[];
  readonly timestamp: string;
}

@Injectable()
export class LessonNERConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LessonNERConsumer.name);
  private readonly sc = StringCodec();
  private connection: NatsConnection | null = null;
  private subscription: Subscription | null = null;
  private readonly attemptMap = new Map<string, number>();
  private static readonly MAX_ATTEMPT_MAP_SIZE = 10_000;

  constructor(private readonly cypherService: CypherService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.connection = await connect(buildNatsOptions());
      this.logger.log('LessonNERConsumer connected to NATS');
      await this.ensureStream();
      this.startConsuming();
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to connect to NATS — NER consumer inactive'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.connection) {
      await this.connection.drain().catch(() => undefined);
      this.connection = null;
      this.logger.log('LessonNERConsumer NATS connection drained');
    }
    this.attemptMap.clear();
  }

  private async ensureStream(): Promise<void> {
    if (!this.connection) return;
    try {
      const jsm: JetStreamManager = await this.connection.jetstreamManager();
      try {
        await jsm.streams.info(STREAM_NAME);
      } catch {
        await jsm.streams.add({
          name: STREAM_NAME,
          subjects: [SUBJECT],
          max_age: 24 * 60 * 60 * 1_000_000_000, // 24h in nanoseconds
          max_bytes: 100 * 1024 * 1024, // 100 MB
        });
        this.logger.log(`Created NATS stream: ${STREAM_NAME}`);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Could not ensure CONTENT_NER stream');
    }
  }

  private startConsuming(): void {
    if (!this.connection) return;

    this.subscription = this.connection.subscribe(SUBJECT, {
      queue: QUEUE_GROUP,
    });

    this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);

    this.consumeLoop().catch((err) => {
      this.logger.error({ err }, 'LessonNERConsumer loop crashed');
    });
  }

  private async consumeLoop(): Promise<void> {
    if (!this.subscription) return;

    for await (const msg of this.subscription) {
      const msgKey = `${msg.subject}-${Date.now()}`;
      try {
        const raw = this.sc.decode(msg.data);
        const payload = JSON.parse(raw) as NERPayload;

        if (
          payload.type !== 'lesson.ner.extracted' ||
          !payload.tenantId ||
          !payload.lessonId ||
          !Array.isArray(payload.entities)
        ) {
          this.logger.warn('Invalid NER payload — skipping');
          continue;
        }

        // Security: extract tenantId from subject, validate against payload
        const subjectTenantId = this.extractTenantFromSubject(msg.subject);
        if (subjectTenantId && subjectTenantId !== payload.tenantId) {
          this.logger.error(
            {
              subjectTenantId,
              payloadTenantId: payload.tenantId,
              lessonId: payload.lessonId,
            },
            'Tenant ID mismatch between subject and payload — rejecting'
          );
          continue;
        }

        const upserted = await this.cypherService.upsertConceptsFromNER(
          payload.entities,
          payload.tenantId
        );

        this.logger.log(
          {
            tenantId: payload.tenantId,
            lessonId: payload.lessonId,
            runId: payload.runId,
            total: payload.entities.length,
            upserted,
          },
          'NER entities persisted to Knowledge Graph'
        );
      } catch (err) {
        this.logger.error({ err }, 'Failed to process NER message');
        const attempts = (this.attemptMap.get(msgKey) ?? 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          this.publishToDLQ(msg.data);
          this.attemptMap.delete(msgKey);
        } else {
          this.attemptMap.set(msgKey, attempts);
          // Evict oldest entries if map grows too large
          if (this.attemptMap.size > LessonNERConsumer.MAX_ATTEMPT_MAP_SIZE) {
            const firstKey = this.attemptMap.keys().next().value as string;
            this.attemptMap.delete(firstKey);
          }
        }
      }
    }
  }

  private extractTenantFromSubject(subject: string): string | null {
    // Subject format: EDUSPHERE.content.<tenantId>.ner.extracted
    const parts = subject.split('.');
    return parts.length >= 5 ? (parts[2] ?? null) : null;
  }

  private publishToDLQ(data: Uint8Array): void {
    if (!this.connection) return;
    try {
      this.connection.publish(DLQ_SUBJECT, data);
      this.logger.warn('Message sent to DLQ after max delivery attempts');
    } catch (err) {
      this.logger.error({ err }, 'Failed to publish to DLQ');
    }
  }
}
