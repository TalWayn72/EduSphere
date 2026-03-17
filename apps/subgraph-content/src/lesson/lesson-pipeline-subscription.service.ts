import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription as NatsSub,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type { LessonPipelineModuleCompletedPayload } from '@edusphere/nats-client';
import { NatsPubSub } from '@edusphere/nats-pubsub';

/** Per-runId channel prefix for GraphQL subscription filtering */
const CHANNEL_PREFIX = 'pipeline.progress.';

/** Max 2 updates/sec per runId (500ms debounce) */
const DEBOUNCE_MS = 500;

/** LRU cap — prevent unbounded growth of debounce timestamps */
const MAX_DEBOUNCE_ENTRIES = 1000;

@Injectable()
export class LessonPipelineSubscriptionService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPipelineSubscriptionService.name);
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private natsSub: NatsSub | null = null;
  private pubSub: NatsPubSub | null = null;
  private readonly lastEmitByRun = new Map<string, number>();

  async onModuleDestroy(): Promise<void> {
    if (this.natsSub) {
      this.natsSub.unsubscribe();
      this.natsSub = null;
    }
    if (this.pubSub) {
      await this.pubSub.close();
      this.pubSub = null;
    }
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    this.lastEmitByRun.clear();
  }

  /** Lazily initialize NATS connection + PubSub engine */
  private async ensureConnected(): Promise<NatsPubSub> {
    if (this.pubSub) return this.pubSub;

    this.nc = await connect(buildNatsOptions());
    this.pubSub = new NatsPubSub(this.nc);

    // Subscribe to all pipeline module completion events
    this.natsSub = this.nc.subscribe(
      'EDUSPHERE.lesson.pipeline.module.completed'
    );

    this.logger.log('NATS pipeline subscription bridge started');

    // Bridge NATS → NatsPubSub per-runId channels
    void this.processMessages();

    return this.pubSub;
  }

  private async processMessages(): Promise<void> {
    if (!this.natsSub) return;

    for await (const msg of this.natsSub) {
      try {
        const payload = JSON.parse(
          this.sc.decode(msg.data)
        ) as LessonPipelineModuleCompletedPayload;

        const { runId } = payload;
        if (!runId) continue;

        // Debounce: max 2 updates/sec per runId
        const now = Date.now();
        const lastEmit = this.lastEmitByRun.get(runId) ?? 0;
        if (now - lastEmit < DEBOUNCE_MS) continue;

        // LRU eviction for debounce map
        if (this.lastEmitByRun.size >= MAX_DEBOUNCE_ENTRIES) {
          const firstKey = this.lastEmitByRun.keys().next().value;
          if (firstKey !== undefined) this.lastEmitByRun.delete(firstKey);
        }
        this.lastEmitByRun.set(runId, now);

        // Publish to per-runId channel for GraphQL subscriptions
        const channel = `${CHANNEL_PREFIX}${runId}`;
        await this.pubSub?.publish(channel, {
          lessonPipelineProgress: {
            id: runId,
            status: payload.status === 'COMPLETED' ? 'RUNNING' : 'FAILED',
            moduleType: payload.moduleType,
            moduleName: payload.moduleName,
            timestamp: payload.timestamp,
          },
        });

        this.logger.debug(
          `[LessonPipelineSubscription] Published progress for run=${runId} module=${payload.moduleType}`
        );
      } catch {
        this.logger.warn(
          '[LessonPipelineSubscription] Failed to parse NATS message'
        );
      }
    }
  }

  /** Get AsyncIterator for a specific runId — used by subscription resolver */
  async iteratorForRun(runId: string): Promise<AsyncIterableIterator<unknown>> {
    const pubSub = await this.ensureConnected();
    const channel = `${CHANNEL_PREFIX}${runId}`;
    return pubSub.asyncIterableIterator(channel);
  }
}
