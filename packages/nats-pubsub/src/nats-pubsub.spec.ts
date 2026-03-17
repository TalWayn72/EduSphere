/**
 * Unit tests for NatsPubSub engine.
 * Covers: publish, subscribe, unsubscribe, close, and edge cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── mock nats ────────────────────────────────────────────────────────────── */

const mockNcPublish = vi.fn();
const mockSubUnsubscribe = vi.fn();

function createMockSubscription(messages: unknown[] = []) {
  let idx = 0;
  const sc = {
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  };

  const sub = {
    unsubscribe: mockSubUnsubscribe,
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        if (idx < messages.length) {
          const val = messages[idx++];
          return {
            value: { data: Buffer.from(JSON.stringify(val)) },
            done: false,
          };
        }
        // Block forever after messages are exhausted
        return new Promise<never>(() => {});
      },
    }),
  };

  return { sub, sc };
}

const mockNcSubscribe = vi.fn();

function createMockNatsConnection(messages: unknown[] = []) {
  const { sub } = createMockSubscription(messages);
  mockNcSubscribe.mockReturnValue(sub);

  return {
    publish: mockNcPublish,
    subscribe: mockNcSubscribe,
  };
}

/* ── import after mocks ───────────────────────────────────────────────────── */

// We import directly since NatsPubSub takes NatsConnection as constructor arg
import { NatsPubSub } from './nats-pubsub';
import type { NatsConnection } from 'nats';

describe('NatsPubSub', () => {
  let pubSub: NatsPubSub;
  let mockNc: ReturnType<typeof createMockNatsConnection>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNc = createMockNatsConnection();
    pubSub = new NatsPubSub(mockNc as unknown as NatsConnection);
  });

  describe('publish()', () => {
    it('encodes and publishes payload to NATS', async () => {
      await pubSub.publish('test.channel', { foo: 'bar' });

      expect(mockNcPublish).toHaveBeenCalledTimes(1);
      expect(mockNcPublish).toHaveBeenCalledWith(
        'test.channel',
        expect.any(Uint8Array)
      );
    });

    it('publishes JSON-serialized payload', async () => {
      await pubSub.publish('ch.1', { count: 42 });

      const data = mockNcPublish.mock.calls[0][1] as Uint8Array;
      const decoded = Buffer.from(data).toString();
      expect(JSON.parse(decoded)).toEqual({ count: 42 });
    });

    it('handles string payload', async () => {
      await pubSub.publish('ch.str', 'hello');

      const data = mockNcPublish.mock.calls[0][1] as Uint8Array;
      const decoded = Buffer.from(data).toString();
      expect(JSON.parse(decoded)).toBe('hello');
    });

    it('handles null payload', async () => {
      await pubSub.publish('ch.null', null);

      const data = mockNcPublish.mock.calls[0][1] as Uint8Array;
      const decoded = Buffer.from(data).toString();
      expect(JSON.parse(decoded)).toBeNull();
    });
  });

  describe('subscribe()', () => {
    it('returns a numeric subscription ID', async () => {
      const id = await pubSub.subscribe('test.sub', vi.fn());
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });

    it('returns incrementing IDs for multiple subscriptions', async () => {
      const id1 = await pubSub.subscribe('ch.1', vi.fn());
      const id2 = await pubSub.subscribe('ch.2', vi.fn());
      expect(id2).toBe(id1 + 1);
    });

    it('subscribes to the NATS subject', async () => {
      await pubSub.subscribe('my.trigger', vi.fn());
      expect(mockNcSubscribe).toHaveBeenCalledWith('my.trigger');
    });

    it('processes messages and calls onMessage callback', async () => {
      const messages = [{ data: 'hello' }];
      const { sub } = createMockSubscription(messages);
      mockNcSubscribe.mockReturnValue(sub);

      const onMessage = vi.fn();
      await pubSub.subscribe('ch.msg', onMessage);

      // Wait for background message processing
      await new Promise((r) => setTimeout(r, 50));

      expect(onMessage).toHaveBeenCalledWith({ data: 'hello' });
    });
  });

  describe('unsubscribe()', () => {
    it('unsubscribes the NATS subscription by ID', async () => {
      const id = await pubSub.subscribe('ch.unsub', vi.fn());
      pubSub.unsubscribe(id);
      expect(mockSubUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('removes subscription from internal map', async () => {
      const id = await pubSub.subscribe('ch.unsub2', vi.fn());
      pubSub.unsubscribe(id);

      // Unsubscribing again should be a no-op (already removed)
      mockSubUnsubscribe.mockClear();
      pubSub.unsubscribe(id);
      expect(mockSubUnsubscribe).not.toHaveBeenCalled();
    });

    it('is a no-op for unknown subscription ID', () => {
      pubSub.unsubscribe(9999);
      expect(mockSubUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('close()', () => {
    it('drains all active subscriptions', async () => {
      await pubSub.subscribe('ch.close1', vi.fn());
      await pubSub.subscribe('ch.close2', vi.fn());

      await pubSub.close();

      expect(mockSubUnsubscribe).toHaveBeenCalledTimes(2);
    });

    it('empties internal subscriptions map after close', async () => {
      const id1 = await pubSub.subscribe('ch.x', vi.fn());
      await pubSub.close();

      // After close, unsubscribe on old IDs should be no-op
      mockSubUnsubscribe.mockClear();
      pubSub.unsubscribe(id1);
      expect(mockSubUnsubscribe).not.toHaveBeenCalled();
    });

    it('is safe to call with no subscriptions', async () => {
      await expect(pubSub.close()).resolves.not.toThrow();
    });

    it('is safe to call twice', async () => {
      await pubSub.subscribe('ch.double', vi.fn());
      await pubSub.close();
      await expect(pubSub.close()).resolves.not.toThrow();
    });
  });
});
