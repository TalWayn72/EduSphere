/**
 * Memory safety tests for LessonPipelineSubscriptionService.
 * Verifies that onModuleDestroy properly cleans up:
 *   1. NATS subscription (unsubscribe)
 *   2. NatsPubSub engine (close)
 *   3. NATS connection (drain)
 *   4. Debounce map (clear)
 *   5. No dangling references after destroy
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDrain, mockSubUnsubscribe, mockPubSubClose } = vi.hoisted(() => ({
  mockDrain: vi.fn().mockResolvedValue(undefined),
  mockSubUnsubscribe: vi.fn(),
  mockPubSubClose: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue({
      unsubscribe: mockSubUnsubscribe,
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise(() => {}), // never resolves — simulates idle subscription
      }),
    }),
    publish: vi.fn(),
    drain: mockDrain,
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

vi.mock('@edusphere/nats-pubsub', () => {
  return {
    NatsPubSub: class MockNatsPubSub {
      publish = vi.fn().mockResolvedValue(undefined);
      close = mockPubSubClose;
      asyncIterableIterator = vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: () => ({ next: vi.fn() }),
      });
    },
  };
});

import { LessonPipelineSubscriptionService } from './lesson-pipeline-subscription.service';

describe('LessonPipelineSubscriptionService — memory safety', () => {
  let service: LessonPipelineSubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPipelineSubscriptionService();
  });

  it('onModuleDestroy calls unsubscribe on NATS subscription', async () => {
    // Trigger lazy connection
    await service.iteratorForRun('run-mem-1');

    await service.onModuleDestroy();

    expect(mockSubUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy calls close on PubSub engine', async () => {
    await service.iteratorForRun('run-mem-2');

    await service.onModuleDestroy();

    expect(mockPubSubClose).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy calls drain on NATS connection', async () => {
    await service.iteratorForRun('run-mem-3');

    await service.onModuleDestroy();

    expect(mockDrain).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy clears the debounce map', async () => {
    await service.iteratorForRun('run-mem-4');

    const map = (service as unknown as { lastEmitByRun: Map<string, number> })
      .lastEmitByRun;
    map.set('run-1', Date.now());
    map.set('run-2', Date.now());

    await service.onModuleDestroy();

    expect(map.size).toBe(0);
  });

  it('no dangling NATS subscription after destroy', async () => {
    await service.iteratorForRun('run-mem-5');

    await service.onModuleDestroy();

    const priv = service as unknown as { natsSub: unknown };
    expect(priv.natsSub).toBeNull();
  });

  it('no dangling PubSub reference after destroy', async () => {
    await service.iteratorForRun('run-mem-6');

    await service.onModuleDestroy();

    const priv = service as unknown as { pubSub: unknown };
    expect(priv.pubSub).toBeNull();
  });

  it('no dangling NATS connection after destroy', async () => {
    await service.iteratorForRun('run-mem-7');

    await service.onModuleDestroy();

    const priv = service as unknown as { nc: unknown };
    expect(priv.nc).toBeNull();
  });

  it('double destroy does not throw', async () => {
    await service.iteratorForRun('run-mem-8');

    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();

    // Second call should not call drain again (nc is already null)
    expect(mockDrain).toHaveBeenCalledTimes(1);
  });

  it('destroy without prior connection is safe (no-op)', async () => {
    // Never called iteratorForRun — no connection established
    await expect(service.onModuleDestroy()).resolves.not.toThrow();

    expect(mockDrain).not.toHaveBeenCalled();
    expect(mockSubUnsubscribe).not.toHaveBeenCalled();
    expect(mockPubSubClose).not.toHaveBeenCalled();
  });
});
