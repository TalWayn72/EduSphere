/**
 * pipeline-subscription.integration.spec.ts
 * Integration test for LessonPipelineSubscriptionService.
 *
 * Tests the NATS -> NatsPubSub subscription bridge:
 * - NATS event arrives -> NatsPubSub channel publishes -> subscriber receives
 * - Debounce: rapid events result in max 2/sec delivery
 * - Different runIds route to different channels
 *
 * Mocks: NATS (connection, subscription), NatsPubSub
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────────

const { mockNatsConnection, mockPubSub } = vi.hoisted(() => {
  const mockNatsConnection = {
    subscribe: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  };
  const mockPubSub = {
    publish: vi.fn().mockResolvedValue(undefined),
    asyncIterableIterator: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { mockNatsConnection, mockPubSub };
});

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue(mockNatsConnection),
  StringCodec: vi.fn().mockReturnValue({
    encode: vi.fn((s: string) => new TextEncoder().encode(s)),
    decode: vi.fn((b: Uint8Array) => new TextDecoder().decode(b)),
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn().mockReturnValue({}),
}));

vi.mock('@edusphere/nats-pubsub', () => {
  // NatsPubSub is used with `new` — return a class that delegates to mockPubSub
  return {
    NatsPubSub: class {
      publish = mockPubSub.publish;
      asyncIterableIterator = mockPubSub.asyncIterableIterator;
      close = mockPubSub.close;
    },
  };
});

import { LessonPipelineSubscriptionService } from '../../lesson/lesson-pipeline-subscription.service';

// ── Mock NATS subscription (controllable message delivery) ──────────────────

interface NatsMsg {
  subject: string;
  data: Uint8Array;
}

function createMockNatsSub(): {
  push: (msg: NatsMsg) => void;
  complete: () => void;
  unsubscribe: () => void;
  [Symbol.asyncIterator]: () => AsyncIterableIterator<NatsMsg>;
} {
  const messages: NatsMsg[] = [];
  let resolver: ((value: IteratorResult<NatsMsg>) => void) | null = null;
  let done = false;

  return {
    push(msg: NatsMsg): void {
      if (resolver) {
        const r = resolver;
        resolver = null;
        r({ value: msg, done: false });
      } else {
        messages.push(msg);
      }
    },
    complete(): void {
      done = true;
      if (resolver) {
        resolver({ value: undefined as unknown as NatsMsg, done: true });
      }
    },
    unsubscribe(): void {
      done = true;
      if (resolver) {
        resolver({ value: undefined as unknown as NatsMsg, done: true });
      }
    },
    [Symbol.asyncIterator](): AsyncIterableIterator<NatsMsg> {
      return {
        next(): Promise<IteratorResult<NatsMsg>> {
          if (messages.length > 0) {
            return Promise.resolve({ value: messages.shift()!, done: false });
          }
          if (done) {
            return Promise.resolve({
              value: undefined as unknown as NatsMsg,
              done: true,
            });
          }
          return new Promise((resolve) => {
            resolver = resolve;
          });
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const publishedChannelMessages: Array<{ channel: string; payload: unknown }> =
  [];

function encodeEvent(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

function makeModuleEvent(
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return {
    type: 'lesson.pipeline.module.completed',
    lessonId: 'lesson-1',
    runId: 'run-1',
    moduleType: 'INGESTION',
    moduleName: 'INGESTION',
    status: 'COMPLETED',
    tenantId: 'tenant-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Pipeline Subscription Integration', () => {
  let service: LessonPipelineSubscriptionService;
  let currentNatsSub: ReturnType<typeof createMockNatsSub>;

  beforeEach(() => {
    vi.clearAllMocks();
    publishedChannelMessages.length = 0;

    // Fresh NATS sub per test
    currentNatsSub = createMockNatsSub();
    mockNatsConnection.subscribe.mockReturnValue(currentNatsSub);
    mockNatsConnection.drain.mockResolvedValue(undefined);

    // Track published messages
    mockPubSub.publish.mockImplementation(
      async (channel: string, payload: unknown) => {
        publishedChannelMessages.push({ channel, payload });
      }
    );

    // Return a simple async iterator
    mockPubSub.asyncIterableIterator.mockImplementation((_channel: string) => ({
      next: () =>
        new Promise<IteratorResult<unknown>>(() => {
          /* hangs until test ends */
        }),
      [Symbol.asyncIterator]() {
        return this;
      },
    }));

    mockPubSub.close.mockResolvedValue(undefined);

    service = new LessonPipelineSubscriptionService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── NATS -> PubSub bridge ─────────────────────────────────────────────

  it('bridges NATS event to NatsPubSub channel on iteratorForRun call', async () => {
    await service.iteratorForRun('run-1');

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(
        makeModuleEvent({ runId: 'run-1', moduleType: 'INGESTION' })
      ),
    });

    await new Promise((r) => setTimeout(r, 50));

    const runChannel = publishedChannelMessages.filter(
      (m) => m.channel === 'pipeline.progress.run-1'
    );
    expect(runChannel.length).toBe(1);

    const published = runChannel[0]!.payload as Record<string, unknown>;
    const progress = published['lessonPipelineProgress'] as Record<
      string,
      unknown
    >;
    expect(progress['id']).toBe('run-1');
    expect(progress['moduleType']).toBe('INGESTION');
  });

  // ── Different runIds -> different channels ────────────────────────────

  it('routes different runIds to separate channels', async () => {
    await service.iteratorForRun('run-A');

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(
        makeModuleEvent({ runId: 'run-A', moduleType: 'INGESTION' })
      ),
    });

    await new Promise((r) => setTimeout(r, 30));

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(
        makeModuleEvent({ runId: 'run-B', moduleType: 'NER_SOURCE_LINKING' })
      ),
    });

    await new Promise((r) => setTimeout(r, 50));

    const channelA = publishedChannelMessages.filter(
      (m) => m.channel === 'pipeline.progress.run-A'
    );
    const channelB = publishedChannelMessages.filter(
      (m) => m.channel === 'pipeline.progress.run-B'
    );

    expect(channelA.length).toBe(1);
    expect(channelB.length).toBe(1);
  });

  // ── Debounce: rapid events throttled to max 2/sec ─────────────────────

  it('debounces rapid events for the same runId (max 2/sec = 500ms gap)', async () => {
    await service.iteratorForRun('run-debounce');

    for (let i = 0; i < 5; i++) {
      currentNatsSub.push({
        subject: 'EDUSPHERE.lesson.pipeline.module.completed',
        data: encodeEvent(
          makeModuleEvent({ runId: 'run-debounce', moduleType: `MODULE_${i}` })
        ),
      });
    }

    await new Promise((r) => setTimeout(r, 100));

    const debounceChannel = publishedChannelMessages.filter(
      (m) => m.channel === 'pipeline.progress.run-debounce'
    );

    // Only 1 should have been published (first passes, rest debounced within 500ms)
    expect(debounceChannel.length).toBe(1);
  });

  it('allows events after debounce window passes', async () => {
    await service.iteratorForRun('run-window');

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(
        makeModuleEvent({ runId: 'run-window', moduleType: 'INGESTION' })
      ),
    });

    await new Promise((r) => setTimeout(r, 30));

    // Wait for debounce window to pass (500ms)
    await new Promise((r) => setTimeout(r, 550));

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(
        makeModuleEvent({
          runId: 'run-window',
          moduleType: 'NER_SOURCE_LINKING',
        })
      ),
    });

    await new Promise((r) => setTimeout(r, 50));

    const windowChannel = publishedChannelMessages.filter(
      (m) => m.channel === 'pipeline.progress.run-window'
    );

    expect(windowChannel.length).toBe(2);
  });

  // ── Missing runId is skipped ──────────────────────────────────────────

  it('skips events without a runId', async () => {
    await service.iteratorForRun('run-1');

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(makeModuleEvent({ runId: '' })),
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(publishedChannelMessages.length).toBe(0);
  });

  // ── Malformed JSON ────────────────────────────────────────────────────

  it('handles malformed JSON in NATS message without crashing', async () => {
    await service.iteratorForRun('run-1');

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: new TextEncoder().encode('not-valid-json}}}'),
    });

    // Wait for debounce window
    await new Promise((r) => setTimeout(r, 550));

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(makeModuleEvent({ runId: 'run-1' })),
    });

    await new Promise((r) => setTimeout(r, 50));

    const goodMessages = publishedChannelMessages.filter(
      (m) => m.channel === 'pipeline.progress.run-1'
    );
    expect(goodMessages.length).toBe(1);
  });

  // ── Status mapping ────────────────────────────────────────────────────

  it('maps COMPLETED module status to RUNNING progress (pipeline still running)', async () => {
    await service.iteratorForRun('run-map');

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(
        makeModuleEvent({ runId: 'run-map', status: 'COMPLETED' })
      ),
    });

    await new Promise((r) => setTimeout(r, 50));

    const msg = publishedChannelMessages[0]!;
    const progress = (msg.payload as Record<string, unknown>)[
      'lessonPipelineProgress'
    ] as Record<string, unknown>;
    expect(progress['status']).toBe('RUNNING');
  });

  it('maps FAILED module status to FAILED progress', async () => {
    await service.iteratorForRun('run-fail');

    currentNatsSub.push({
      subject: 'EDUSPHERE.lesson.pipeline.module.completed',
      data: encodeEvent(
        makeModuleEvent({ runId: 'run-fail', status: 'FAILED' })
      ),
    });

    await new Promise((r) => setTimeout(r, 50));

    const msg = publishedChannelMessages[0]!;
    const progress = (msg.payload as Record<string, unknown>)[
      'lessonPipelineProgress'
    ] as Record<string, unknown>;
    expect(progress['status']).toBe('FAILED');
  });

  // ── Cleanup ───────────────────────────────────────────────────────────

  it('cleans up NATS connection and PubSub on destroy', async () => {
    await service.iteratorForRun('run-cleanup');

    await service.onModuleDestroy();

    expect(mockPubSub.close).toHaveBeenCalled();
    expect(mockNatsConnection.drain).toHaveBeenCalled();
  });

  it('iteratorForRun returns async iterable iterator', async () => {
    const iter = await service.iteratorForRun('run-iter');
    expect(iter).toBeDefined();
    expect(typeof iter.next).toBe('function');
    expect(typeof iter[Symbol.asyncIterator]).toBe('function');
  });
});
