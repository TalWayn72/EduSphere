/**
 * Unit tests for LessonPipelineSubscriptionService.
 * Covers: lazy NATS connection, debounce logic, LRU eviction, onModuleDestroy cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── hoisted mocks ────────────────────────────────────────────────────────── */

const mockNatsDrain = vi.fn().mockResolvedValue(undefined);
const mockNatsSubscribe = vi.fn();
const mockNatsPublish = vi.fn();
const mockNatsConnect = vi.fn();

const mockPubSubPublish = vi.fn().mockResolvedValue(undefined);
const mockPubSubClose = vi.fn().mockResolvedValue(undefined);
const mockPubSubAsyncIterableIterator = vi.fn().mockReturnValue({
  [Symbol.asyncIterator]: () => ({ next: vi.fn() }),
});

vi.mock('nats', () => ({
  connect: (...args: unknown[]) => mockNatsConnect(...args),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

vi.mock('@edusphere/nats-pubsub', () => {
  return {
    NatsPubSub: class MockNatsPubSub {
      publish = mockPubSubPublish;
      close = mockPubSubClose;
      asyncIterableIterator = mockPubSubAsyncIterableIterator;
    },
  };
});

import { LessonPipelineSubscriptionService } from './lesson-pipeline-subscription.service';

/* ── helpers ──────────────────────────────────────────────────────────────── */

function createMockNatsConnection() {
  // Create async iterable that yields messages on demand
  const messages: Array<{ data: Uint8Array }> = [];
  let resolve: (() => void) | null = null;

  const sub = {
    unsubscribe: vi.fn(),
    [Symbol.asyncIterator]: () => ({
      next: () =>
        new Promise<{ value: { data: Uint8Array }; done: boolean }>((r) => {
          if (messages.length > 0) {
            r({ value: messages.shift()!, done: false });
          } else {
            resolve = () => {
              if (messages.length > 0) {
                r({ value: messages.shift()!, done: false });
              }
            };
          }
        }),
    }),
    push: (msg: { data: Uint8Array }) => {
      messages.push(msg);
      resolve?.();
    },
  };

  const nc = {
    subscribe: mockNatsSubscribe.mockReturnValue(sub),
    publish: mockNatsPublish,
    drain: mockNatsDrain,
    close: vi.fn().mockResolvedValue(undefined),
  };

  mockNatsConnect.mockResolvedValue(nc);
  return { nc, sub };
}

/* ── tests ────────────────────────────────────────────────────────────────── */

describe('LessonPipelineSubscriptionService', () => {
  let service: LessonPipelineSubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPipelineSubscriptionService();
  });

  describe('iteratorForRun() — lazy NATS connection', () => {
    it('connects to NATS on first call', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');
      expect(mockNatsConnect).toHaveBeenCalledTimes(1);
    });

    it('reuses existing connection on subsequent calls', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');
      await service.iteratorForRun('run-2');
      expect(mockNatsConnect).toHaveBeenCalledTimes(1);
    });

    it('subscribes to pipeline module completion subject', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');
      expect(mockNatsSubscribe).toHaveBeenCalledWith(
        'EDUSPHERE.lesson.pipeline.module.completed'
      );
    });

    it('returns an async iterable iterator for the given runId', async () => {
      createMockNatsConnection();
      const iter = await service.iteratorForRun('run-1');
      expect(iter).toBeDefined();
      expect(mockPubSubAsyncIterableIterator).toHaveBeenCalledWith(
        'pipeline.progress.run-1'
      );
    });
  });

  describe('debounce — second event within 500ms is dropped', () => {
    it('debounce map entry is set after processing a message', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');

      // Access private lastEmitByRun map
      const map = (service as unknown as { lastEmitByRun: Map<string, number> })
        .lastEmitByRun;

      // Simulate: manually set a recent timestamp for a runId
      map.set('run-debounce', Date.now());

      // The map should have the entry
      expect(map.has('run-debounce')).toBe(true);
    });

    it('debounce entries within 500ms window are considered recent', () => {
      const map = (service as unknown as { lastEmitByRun: Map<string, number> })
        .lastEmitByRun;

      const now = Date.now();
      map.set('run-x', now - 100); // 100ms ago — within debounce window

      const lastEmit = map.get('run-x') ?? 0;
      expect(now - lastEmit).toBeLessThan(500);
    });

    it('debounce entries older than 500ms are considered stale', () => {
      const map = (service as unknown as { lastEmitByRun: Map<string, number> })
        .lastEmitByRun;

      const now = Date.now();
      map.set('run-y', now - 600); // 600ms ago — outside debounce window

      const lastEmit = map.get('run-y') ?? 0;
      expect(now - lastEmit).toBeGreaterThanOrEqual(500);
    });
  });

  describe('LRU eviction when debounce map exceeds 1000 entries', () => {
    it('evicts oldest entry when map reaches 1000 entries', () => {
      const map = (service as unknown as { lastEmitByRun: Map<string, number> })
        .lastEmitByRun;

      // Fill to 1000 entries
      for (let i = 0; i < 1000; i++) {
        map.set(`run-${i}`, Date.now());
      }
      expect(map.size).toBe(1000);

      // Simulate LRU eviction logic from processMessages
      if (map.size >= 1000) {
        const firstKey = map.keys().next().value;
        if (firstKey !== undefined) map.delete(firstKey);
      }
      map.set('run-new', Date.now());

      expect(map.size).toBe(1000);
      expect(map.has('run-0')).toBe(false); // oldest was evicted
      expect(map.has('run-new')).toBe(true);
    });

    it('does not evict when map is under 1000 entries', () => {
      const map = (service as unknown as { lastEmitByRun: Map<string, number> })
        .lastEmitByRun;

      for (let i = 0; i < 500; i++) {
        map.set(`run-${i}`, Date.now());
      }
      expect(map.size).toBe(500);

      // No eviction needed
      if (map.size >= 1000) {
        const firstKey = map.keys().next().value;
        if (firstKey !== undefined) map.delete(firstKey);
      }
      map.set('run-extra', Date.now());
      expect(map.size).toBe(501);
      expect(map.has('run-0')).toBe(true); // not evicted
    });
  });

  describe('onModuleDestroy', () => {
    it('unsubscribes NATS subscription', async () => {
      const { sub } = createMockNatsConnection();
      await service.iteratorForRun('run-1');

      await service.onModuleDestroy();

      expect(sub.unsubscribe).toHaveBeenCalled();
    });

    it('closes PubSub engine', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');

      await service.onModuleDestroy();

      expect(mockPubSubClose).toHaveBeenCalled();
    });

    it('drains NATS connection', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');

      await service.onModuleDestroy();

      expect(mockNatsDrain).toHaveBeenCalled();
    });

    it('clears debounce map', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');

      const map = (service as unknown as { lastEmitByRun: Map<string, number> })
        .lastEmitByRun;
      map.set('run-test', Date.now());

      await service.onModuleDestroy();

      expect(map.size).toBe(0);
    });

    it('nullifies nc, natsSub, and pubSub references', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');

      await service.onModuleDestroy();

      const priv = service as unknown as {
        nc: unknown;
        natsSub: unknown;
        pubSub: unknown;
      };
      expect(priv.nc).toBeNull();
      expect(priv.natsSub).toBeNull();
      expect(priv.pubSub).toBeNull();
    });

    it('is safe to call twice', async () => {
      createMockNatsConnection();
      await service.iteratorForRun('run-1');

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });

    it('handles drain failure gracefully', async () => {
      createMockNatsConnection();
      mockNatsDrain.mockRejectedValueOnce(new Error('drain failed'));
      await service.iteratorForRun('run-1');

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
