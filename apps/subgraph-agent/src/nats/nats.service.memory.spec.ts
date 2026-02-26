/**
 * nats.service.memory.spec.ts
 *
 * Wave 5-A: Memory leak tests for NatsService subscription tracking.
 *
 * Verifies:
 *   1. After N subscribe() calls, this.subscriptions has N entries.
 *   2. onModuleDestroy() invokes every cleanup function in the array.
 *   3. After onModuleDestroy(), the subscriptions array is empty.
 *   4. connection.drain() is called during onModuleDestroy().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── NATS mock — same shape as nats.service.spec.ts ───────────────────────────

let mockDrain: ReturnType<typeof vi.fn>;
let mockUnsubscribe: ReturnType<typeof vi.fn>;
let mockSubscribeCall: ReturnType<typeof vi.fn>;

vi.mock('nats', () => {
  const encode = (s: string): Uint8Array => Buffer.from(s);
  const decode = (b: Uint8Array): string => Buffer.from(b).toString('utf8');

  return {
    StringCodec: vi.fn(() => ({ encode, decode })),
    connect: vi.fn().mockImplementation(async () => {
      mockDrain = vi.fn().mockResolvedValue(undefined);
      mockUnsubscribe = vi.fn();
      mockSubscribeCall = vi.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe,
        // Immediately-done async iterator — no messages are emitted.
        [Symbol.asyncIterator]() {
          return {
            next: async () => ({
              value: undefined as unknown as { data: Uint8Array },
              done: true,
            }),
          };
        },
      });

      return {
        publish: vi.fn(),
        drain: mockDrain,
        subscribe: mockSubscribeCall,
      };
    }),
  };
});

import { NatsService } from './nats.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Access private `subscriptions` array via type casting. */
const getSubscriptions = (svc: NatsService): Array<() => void> =>
  (svc as unknown as { subscriptions: Array<() => void> }).subscriptions;

const noopHandler = vi.fn().mockResolvedValue(undefined);

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('NatsService — memory leak / subscription tracking', () => {
  let service: NatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NatsService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── Test 1: subscriptions array grows with each subscribe() call ──────────

  describe('subscribe() — array growth', () => {
    it('adds 1 entry after a single subscribe()', async () => {
      await service.subscribe('subject.a', noopHandler);
      expect(getSubscriptions(service)).toHaveLength(1);
    });

    it('adds 3 entries after three subscribe() calls', async () => {
      await service.subscribe('subject.a', noopHandler);
      await service.subscribe('subject.b', noopHandler);
      await service.subscribe('subject.c', noopHandler);
      expect(getSubscriptions(service)).toHaveLength(3);
    });

    it('adds N entries after N subscribe() calls', async () => {
      const N = 7;
      for (let i = 0; i < N; i++) {
        await service.subscribe(`subject.${i}`, noopHandler);
      }
      expect(getSubscriptions(service)).toHaveLength(N);
    });

    it('each entry in the array is a function', async () => {
      await service.subscribe('subject.x', noopHandler);
      const subs = getSubscriptions(service);
      expect(typeof subs[0]).toBe('function');
    });
  });

  // ── Test 2: onModuleDestroy() invokes all cleanup functions ───────────────

  describe('onModuleDestroy() — cleanup invocation', () => {
    it('calls each registered cleanup function once', async () => {
      // Subscribe 3 times to get 3 distinct NATS subscriptions.
      await service.subscribe('subject.a', noopHandler);
      await service.subscribe('subject.b', noopHandler);
      await service.subscribe('subject.c', noopHandler);

      // mockUnsubscribe tracks calls to sub.unsubscribe() — each cleanup fn
      // wraps a single sub.unsubscribe().
      vi.clearAllMocks(); // reset call counts after subscribe

      await service.onModuleDestroy();

      // 3 subscriptions → unsubscribe called 3 times.
      expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
    });

    it('resolves without throwing when no subscriptions exist', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('calls all cleanup fns even when subscriptions array had 1 entry', async () => {
      await service.subscribe('subject.only', noopHandler);
      vi.clearAllMocks();

      await service.onModuleDestroy();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 3: subscriptions array is empty after onModuleDestroy() ──────────

  describe('onModuleDestroy() — array cleared', () => {
    it('leaves subscriptions array empty', async () => {
      await service.subscribe('subject.a', noopHandler);
      await service.subscribe('subject.b', noopHandler);

      await service.onModuleDestroy();

      expect(getSubscriptions(service)).toHaveLength(0);
    });

    it('subscriptions array is empty even when none were registered', async () => {
      await service.onModuleDestroy();
      expect(getSubscriptions(service)).toHaveLength(0);
    });

    it('a second onModuleDestroy() call does not re-invoke stale cleanups', async () => {
      await service.subscribe('subject.a', noopHandler);
      await service.onModuleDestroy();
      vi.clearAllMocks();

      // Second destroy — connection is null, array is empty.
      await service.onModuleDestroy();
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  // ── Test 4: connection.drain() is called during onModuleDestroy() ─────────

  describe('onModuleDestroy() — connection.drain()', () => {
    it('calls connection.drain() after at least one subscribe()', async () => {
      await service.subscribe('subject.a', noopHandler);
      await service.onModuleDestroy();
      expect(mockDrain).toHaveBeenCalledTimes(1);
    });

    it('calls connection.drain() after publish() triggers a connection', async () => {
      // Force connection establishment via publish.
      await service.publish({
        type: 'session.created',
        sessionId: 'sess-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        data: {},
        timestamp: new Date().toISOString(),
      });

      await service.onModuleDestroy();
      expect(mockDrain).toHaveBeenCalledTimes(1);
    });

    it('does NOT call drain when no connection was ever established', async () => {
      // Fresh service — never published or subscribed.
      const fresh = new NatsService();
      await fresh.onModuleDestroy();
      // mockDrain is only set after connect() is called; it should not have been invoked.
      // If mockDrain is still the vi.fn() from a previous test, check call count is 0.
      expect(mockDrain).not.toHaveBeenCalled();
    });
  });
});
