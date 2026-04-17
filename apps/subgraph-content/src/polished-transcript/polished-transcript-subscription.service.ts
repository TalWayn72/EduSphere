import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription as NatsSub,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { NatsPubSub } from '@edusphere/nats-pubsub';

// NATS subject constants for the polishing pipeline (mirror of polishing.events.ts)
const POLISHING_EVENTS = {
  STARTED: 'EDUSPHERE.polishing.started',
  PROGRESS: 'EDUSPHERE.polishing.progress',
  COMPLETED: 'EDUSPHERE.polishing.completed',
  FAILED: 'EDUSPHERE.polishing.failed',
} as const;

const CHANNEL_PREFIX = 'polishing.progress.';
const DEBOUNCE_MS = 300;
const MAX_DEBOUNCE_ENTRIES = 2000;

interface AnyPolishingPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId?: string;
  readonly timestamp: string;
  readonly progress?: number;
  readonly errorMessage?: string;
}

function isPolishingPayload(v: unknown): v is AnyPolishingPayload {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj['lessonId'] === 'string' && typeof obj['tenantId'] === 'string'
  );
}

const STATUS_MAP: Record<string, string> = {
  [POLISHING_EVENTS.STARTED]: 'PROCESSING',
  [POLISHING_EVENTS.PROGRESS]: 'PROCESSING',
  [POLISHING_EVENTS.COMPLETED]: 'DRAFT',
  [POLISHING_EVENTS.FAILED]: 'DRAFT',
};

@Injectable()
export class PolishingSubscriptionService implements OnModuleDestroy {
  private readonly logger = new Logger(PolishingSubscriptionService.name);
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private readonly natsSubs: NatsSub[] = [];
  private pubSub: NatsPubSub | null = null;
  private readonly lastEmitByLesson = new Map<string, number>();

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.natsSubs) sub.unsubscribe();
    this.natsSubs.length = 0;
    if (this.pubSub) {
      await this.pubSub.close();
      this.pubSub = null;
    }
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    this.lastEmitByLesson.clear();
  }

  private async ensureConnected(): Promise<NatsPubSub> {
    if (this.pubSub) return this.pubSub;

    this.nc = await connect(buildNatsOptions());
    this.pubSub = new NatsPubSub(this.nc);

    const subjects = [
      POLISHING_EVENTS.STARTED,
      POLISHING_EVENTS.PROGRESS,
      POLISHING_EVENTS.COMPLETED,
      POLISHING_EVENTS.FAILED,
    ];

    for (const subject of subjects) {
      const sub = this.nc.subscribe(subject);
      this.natsSubs.push(sub);
      void this.processMessages(sub, subject);
    }

    this.logger.log('Polishing subscription bridge started');
    return this.pubSub;
  }

  private async processMessages(sub: NatsSub, subject: string): Promise<void> {
    for await (const msg of sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as unknown;
        if (!isPolishingPayload(raw)) continue;
        await this.forwardEvent(raw, subject);
      } catch {
        this.logger.warn(`[PolishingSubscription] Failed to parse ${subject}`);
      }
    }
  }

  private async forwardEvent(
    payload: AnyPolishingPayload,
    subject: string
  ): Promise<void> {
    const { lessonId } = payload;
    const now = Date.now();
    const lastEmit = this.lastEmitByLesson.get(lessonId) ?? 0;
    if (now - lastEmit < DEBOUNCE_MS) return;

    if (this.lastEmitByLesson.size >= MAX_DEBOUNCE_ENTRIES) {
      const firstKey = this.lastEmitByLesson.keys().next().value;
      if (firstKey !== undefined) this.lastEmitByLesson.delete(firstKey);
    }
    this.lastEmitByLesson.set(lessonId, now);

    const progress = this.deriveProgress(payload, subject);
    const status = STATUS_MAP[subject] ?? 'PROCESSING';

    const channel = `${CHANNEL_PREFIX}${lessonId}`;
    await this.pubSub?.publish(channel, {
      polishingProgress: {
        lessonId,
        polishedTranscriptId: payload.polishedTranscriptId ?? null,
        progress,
        status,
        message: payload.errorMessage ?? null,
        timestamp: payload.timestamp,
      },
    });
  }

  private deriveProgress(
    payload: AnyPolishingPayload,
    subject: string
  ): number {
    if (subject === POLISHING_EVENTS.STARTED) return 0;
    if (subject === POLISHING_EVENTS.COMPLETED) return 100;
    if (subject === POLISHING_EVENTS.FAILED) return 0;
    if (typeof payload.progress === 'number') return payload.progress;
    return 50;
  }

  async iteratorForLesson(
    lessonId: string
  ): Promise<AsyncIterableIterator<unknown>> {
    const pubSub = await this.ensureConnected();
    const channel = `${CHANNEL_PREFIX}${lessonId}`;
    return pubSub.asyncIterableIterator(channel);
  }
}
