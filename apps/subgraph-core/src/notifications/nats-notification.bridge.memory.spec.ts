/**
 * nats-notification.bridge.memory.spec.ts
 *
 * Memory-safety tests for NatsNotificationBridge subscription tracking.
 *
 * Verifies:
 *   1. After onModuleInit(), _subs has one entry per watched NATS subject.
 *   2. onModuleDestroy() calls sub.unsubscribe() for every tracked subscription.
 *   3. After onModuleDestroy(), _subs array is empty.
 *   4. connection.drain() is called during onModuleDestroy().
 *   5. A second onModuleDestroy() call does not re-invoke stale cleanups.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── NATS mock ─────────────────────────────────────────────────────────────────

let mockDrain: ReturnType<typeof vi.fn>;
let mockUnsubscribeFns: ReturnType<typeof vi.fn>[];

vi.mock('nats', () => {
  const encode = (s: string): Uint8Array => Buffer.from(s);
  const decode = (b: Uint8Array): string => Buffer.from(b).toString('utf8');

  return {
    StringCodec: vi.fn(() => ({ encode, decode })),
    connect: vi.fn().mockImplementation(async () => {
      mockDrain = vi.fn().mockResolvedValue(undefined);
      mockUnsubscribeFns = [];

      return {
        drain: mockDrain,
        subscribe: vi.fn().mockImplementation(() => {
          const mockUnsubscribe = vi.fn();
          mockUnsubscribeFns.push(mockUnsubscribe);

          // Immediately-done async iterator — emits no messages.
          const sub = {
            unsubscribe: mockUnsubscribe,
            [Symbol.asyncIterator]() {
              return {
                next: async () => ({
                  value: undefined as unknown as { data: Uint8Array },
                  done: true,
                }),
              };
            },
          };
          return sub;
        }),
      };
    }),
  };
});

// ── buildNatsOptions mock ─────────────────────────────────────────────────────

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

// ── Import after mocks are in place ──────────────────────────────────────────

import { NatsNotificationBridge } from './nats-notification.bridge';
import type { NotificationPubSub } from './notifications.pubsub';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Total number of NATS subjects watched by the bridge. */
const WATCHED_SUBJECT_COUNT = 4; // badge.issued, course.enrolled, user.followed, srs.review.due

/** Access private _subs array via type casting. */
function getSubs(bridge: NatsNotificationBridge) {
  return (bridge as unknown as { _subs: unknown[] })._subs;
}

function makeMockPubSub(): NotificationPubSub {
  return {
    publish: vi.fn(),
    subscribe: vi.fn(),
  } as unknown as NotificationPubSub;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('NatsNotificationBridge — memory leak / subscription tracking', () => {
  let bridge: NatsNotificationBridge;
  let mockPubSub: NotificationPubSub;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribeFns = [];
    mockPubSub = makeMockPubSub();
    bridge = new NatsNotificationBridge(mockPubSub);
  });

  afterEach(async () => {
    await bridge.onModuleDestroy();
  });

  // ── Test 1: _subs grows to match watched subject count after init ──────────

  describe('onModuleInit() — subscription registration', () => {
    it(`registers ${WATCHED_SUBJECT_COUNT} subscriptions (one per NATS subject)`, async () => {
      await bridge.onModuleInit();
      expect(getSubs(bridge)).toHaveLength(WATCHED_SUBJECT_COUNT);
    });

    it('all entries in _subs have an unsubscribe() method', async () => {
      await bridge.onModuleInit();
      const subs = getSubs(bridge) as Array<{ unsubscribe: unknown }>;
      subs.forEach((sub) => {
        expect(typeof sub.unsubscribe).toBe('function');
      });
    });
  });

  // ── Test 2: onModuleDestroy() calls unsubscribe() on all subs ─────────────

  describe('onModuleDestroy() — unsubscribe invocation', () => {
    it(`calls unsubscribe() ${WATCHED_SUBJECT_COUNT} times — once per NATS subscription`, async () => {
      await bridge.onModuleInit();
      vi.clearAllMocks(); // reset after init

      await bridge.onModuleDestroy();

      // Each registered NATS sub's unsubscribe should be called exactly once.
      const totalCalls = mockUnsubscribeFns.reduce(
        (acc, fn) => acc + fn.mock.calls.length,
        0,
      );
      expect(totalCalls).toBe(WATCHED_SUBJECT_COUNT);
    });

    it('resolves without throwing when called before onModuleInit()', async () => {
      await expect(bridge.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  // ── Test 3: _subs array is empty after onModuleDestroy() ──────────────────

  describe('onModuleDestroy() — array cleared', () => {
    it('leaves _subs empty after destroy', async () => {
      await bridge.onModuleInit();
      await bridge.onModuleDestroy();
      expect(getSubs(bridge)).toHaveLength(0);
    });

    it('_subs is empty even when onModuleInit() was never called', async () => {
      await bridge.onModuleDestroy();
      expect(getSubs(bridge)).toHaveLength(0);
    });
  });

  // ── Test 4: connection.drain() is called during onModuleDestroy() ─────────

  describe('onModuleDestroy() — connection.drain()', () => {
    it('calls connection.drain() after a successful onModuleInit()', async () => {
      await bridge.onModuleInit();
      await bridge.onModuleDestroy();
      expect(mockDrain).toHaveBeenCalledTimes(1);
    });

    it('does NOT call drain when NATS never connected (no onModuleInit)', async () => {
      const fresh = new NatsNotificationBridge(makeMockPubSub());
      await fresh.onModuleDestroy();
      // mockDrain is only defined after connect() runs; it should not have been called.
      if (mockDrain) {
        expect(mockDrain).not.toHaveBeenCalled();
      }
    });
  });

  // ── Test 5: idempotent destroy ────────────────────────────────────────────

  describe('onModuleDestroy() — idempotent', () => {
    it('a second destroy call does not re-invoke any unsubscribe()', async () => {
      await bridge.onModuleInit();
      await bridge.onModuleDestroy();
      vi.clearAllMocks();

      // Second call — connection is null, _subs is empty.
      await bridge.onModuleDestroy();

      const totalCalls = mockUnsubscribeFns.reduce(
        (acc, fn) => acc + fn.mock.calls.length,
        0,
      );
      expect(totalCalls).toBe(0);
    });
  });
});
