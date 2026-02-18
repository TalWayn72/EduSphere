import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted() ensures mock constructors are ready before vi.mock() hoisting.
// ---------------------------------------------------------------------------

type MessageHandler = (channel: string, message: string) => void;

interface MockRedisInstance {
  publish: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  _messageHandler?: MessageHandler;
}

const { createdInstances, MockRedis } = vi.hoisted(() => {
  const createdInstances: MockRedisInstance[] = [];

  const MockRedis = vi.fn().mockImplementation(() => {
    const instance: MockRedisInstance = {
      publish: vi.fn().mockResolvedValue(1),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockImplementation(function (
        this: MockRedisInstance,
        event: string,
        handler: MessageHandler,
      ) {
        if (event === 'message') {
          this._messageHandler = handler;
        }
      }),
    };
    createdInstances.push(instance);
    return instance;
  });

  return { createdInstances, MockRedis };
});

vi.mock('ioredis', () => ({ default: MockRedis }));

import {
  RedisPubSub,
  getPubSub,
  CHANNELS,
  EVENTS,
  type PubSubMessage,
} from './index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPublisher(): MockRedisInstance {
  return createdInstances[createdInstances.length - 2];
}

function getSubscriber(): MockRedisInstance {
  return createdInstances[createdInstances.length - 1];
}

function fireMessage(subscriber: MockRedisInstance, channel: string, msg: PubSubMessage): void {
  if (subscriber._messageHandler) {
    subscriber._messageHandler(channel, JSON.stringify(msg));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedisPubSub', () => {
  let pubsub: RedisPubSub;

  beforeEach(() => {
    vi.clearAllMocks();
    createdInstances.length = 0;
    MockRedis.mockImplementation(() => {
      const instance: MockRedisInstance = {
        publish: vi.fn().mockResolvedValue(1),
        subscribe: vi.fn().mockResolvedValue(undefined),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
        quit: vi.fn().mockResolvedValue(undefined),
        on: vi.fn().mockImplementation(function (
          this: MockRedisInstance,
          event: string,
          handler: MessageHandler,
        ) {
          if (event === 'message') {
            this._messageHandler = handler;
          }
        }),
      };
      createdInstances.push(instance);
      return instance;
    });
    pubsub = new RedisPubSub('redis://localhost:6379');
  });

  afterEach(async () => {
    await pubsub.close();
  });

  // ── Construction ───────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates two Redis instances (publisher + subscriber)', () => {
      expect(MockRedis).toHaveBeenCalledTimes(2);
    });

    it('connects both instances to the provided URL', () => {
      expect(MockRedis).toHaveBeenNthCalledWith(1, 'redis://localhost:6379');
      expect(MockRedis).toHaveBeenNthCalledWith(2, 'redis://localhost:6379');
    });

    it('registers a "message" listener on the subscriber instance', () => {
      const sub = getSubscriber();
      expect(sub.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('uses default URL when no argument is provided', () => {
      createdInstances.length = 0;
      new RedisPubSub();
      expect(MockRedis).toHaveBeenCalledWith('redis://localhost:6379');
    });
  });

  // ── subscribe ──────────────────────────────────────────────────────────────

  describe('subscribe()', () => {
    it('calls subscriber.subscribe with the channel name', async () => {
      const handler = vi.fn();
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler);
      expect(getSubscriber().subscribe).toHaveBeenCalledWith(CHANNELS.COURSE_UPDATES);
    });

    it('does NOT call subscriber.subscribe again for the same channel', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler1);
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler2);
      expect(getSubscriber().subscribe).toHaveBeenCalledOnce();
    });

    it('subscribes to different channels separately', async () => {
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, vi.fn());
      await pubsub.subscribe(CHANNELS.DISCUSSION_UPDATES, vi.fn());
      expect(getSubscriber().subscribe).toHaveBeenCalledTimes(2);
    });

    it('delivers messages to the registered callback', async () => {
      const handler = vi.fn();
      await pubsub.subscribe(CHANNELS.AGENT_MESSAGES, handler);

      const msg: PubSubMessage = {
        event: EVENTS.AGENT_MESSAGE_CREATED,
        data: 'hello',
        timestamp: Date.now(),
      };
      fireMessage(getSubscriber(), CHANNELS.AGENT_MESSAGES, msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it('invokes all registered callbacks for the same channel', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler1);
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler2);

      const msg: PubSubMessage = {
        event: EVENTS.COURSE_CREATED,
        data: { id: '1' },
        timestamp: Date.now(),
      };
      fireMessage(getSubscriber(), CHANNELS.COURSE_UPDATES, msg);

      expect(handler1).toHaveBeenCalledWith(msg);
      expect(handler2).toHaveBeenCalledWith(msg);
    });
  });

  // ── publish ────────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('calls publisher.publish with the channel and a JSON payload', async () => {
      await pubsub.publish(CHANNELS.COURSE_UPDATES, EVENTS.COURSE_CREATED, { id: 'abc' });

      const pub = getPublisher();
      expect(pub.publish).toHaveBeenCalledOnce();
      const [channel, rawMessage] = pub.publish.mock.calls[0];
      expect(channel).toBe(CHANNELS.COURSE_UPDATES);

      const parsed = JSON.parse(rawMessage as string) as PubSubMessage;
      expect(parsed.event).toBe(EVENTS.COURSE_CREATED);
      expect(parsed.data).toEqual({ id: 'abc' });
    });

    it('includes a numeric timestamp in the published message', async () => {
      await pubsub.publish(CHANNELS.USER_UPDATES, EVENTS.USER_CREATED, {});

      const [, rawMessage] = getPublisher().publish.mock.calls[0];
      const parsed = JSON.parse(rawMessage as string) as PubSubMessage;
      expect(typeof parsed.timestamp).toBe('number');
      expect(parsed.timestamp).toBeGreaterThan(0);
    });

    it('includes tenantId when provided', async () => {
      await pubsub.publish(
        CHANNELS.ANNOTATION_UPDATES,
        EVENTS.ANNOTATION_CREATED,
        {},
        'tenant-99',
      );

      const [, rawMessage] = getPublisher().publish.mock.calls[0];
      const parsed = JSON.parse(rawMessage as string) as PubSubMessage;
      expect(parsed.tenantId).toBe('tenant-99');
    });

    it('omits tenantId when not provided', async () => {
      await pubsub.publish(CHANNELS.COURSE_UPDATES, EVENTS.COURSE_UPDATED, {});

      const [, rawMessage] = getPublisher().publish.mock.calls[0];
      const parsed = JSON.parse(rawMessage as string) as PubSubMessage;
      expect(parsed.tenantId).toBeUndefined();
    });
  });

  // ── unsubscribe ────────────────────────────────────────────────────────────

  describe('unsubscribe()', () => {
    it('unsubscribes from Redis when the last listener is removed', async () => {
      const handler = vi.fn();
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler);
      await pubsub.unsubscribe(CHANNELS.COURSE_UPDATES, handler);
      expect(getSubscriber().unsubscribe).toHaveBeenCalledWith(CHANNELS.COURSE_UPDATES);
    });

    it('does nothing when channel has no listeners', async () => {
      await pubsub.unsubscribe('unknown-channel');
      expect(getSubscriber().unsubscribe).not.toHaveBeenCalled();
    });

    it('keeps remaining callbacks when only one of two listeners is removed', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler1);
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler2);
      await pubsub.unsubscribe(CHANNELS.COURSE_UPDATES, handler1);

      // Redis-level unsubscribe must NOT have been called yet
      expect(getSubscriber().unsubscribe).not.toHaveBeenCalled();

      // handler2 should still receive messages
      const msg: PubSubMessage = {
        event: EVENTS.COURSE_UPDATED,
        data: {},
        timestamp: Date.now(),
      };
      fireMessage(getSubscriber(), CHANNELS.COURSE_UPDATES, msg);
      expect(handler2).toHaveBeenCalledWith(msg);
      expect(handler1).not.toHaveBeenCalled();
    });

    it('unsubscribes from Redis when no callback argument is passed', async () => {
      await pubsub.subscribe(CHANNELS.DISCUSSION_UPDATES, vi.fn());
      await pubsub.unsubscribe(CHANNELS.DISCUSSION_UPDATES);
      expect(getSubscriber().unsubscribe).toHaveBeenCalledWith(CHANNELS.DISCUSSION_UPDATES);
    });
  });

  // ── message handling ───────────────────────────────────────────────────────

  describe('message handling', () => {
    it('does not throw when the channel has no listeners', async () => {
      expect(() => {
        fireMessage(getSubscriber(), 'unknown-channel', {
          event: 'test',
          data: null,
          timestamp: Date.now(),
        });
      }).not.toThrow();
    });

    it('handles malformed JSON gracefully without throwing', async () => {
      const handler = vi.fn();
      await pubsub.subscribe(CHANNELS.COURSE_UPDATES, handler);

      const sub = getSubscriber();
      expect(() => {
        if (sub._messageHandler) {
          sub._messageHandler(CHANNELS.COURSE_UPDATES, 'INVALID_JSON{{{');
        }
      }).not.toThrow();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── close ──────────────────────────────────────────────────────────────────

  describe('close()', () => {
    it('calls quit on both publisher and subscriber', async () => {
      await pubsub.close();
      expect(getPublisher().quit).toHaveBeenCalledOnce();
      expect(getSubscriber().quit).toHaveBeenCalledOnce();
    });
  });
});

// ---------------------------------------------------------------------------
// getPubSub singleton
// ---------------------------------------------------------------------------

describe('getPubSub()', () => {
  it('returns the same instance on repeated calls (singleton)', () => {
    const instance1 = getPubSub('redis://localhost:6379');
    const instance2 = getPubSub();
    expect(instance1).toBe(instance2);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('CHANNELS', () => {
  it('defines COURSE_UPDATES channel', () => {
    expect(CHANNELS.COURSE_UPDATES).toBe('course:updates');
  });

  it('defines DISCUSSION_UPDATES channel', () => {
    expect(CHANNELS.DISCUSSION_UPDATES).toBe('discussion:updates');
  });

  it('defines AGENT_MESSAGES channel', () => {
    expect(CHANNELS.AGENT_MESSAGES).toBe('agent:messages');
  });

  it('defines ANNOTATION_UPDATES channel', () => {
    expect(CHANNELS.ANNOTATION_UPDATES).toBe('annotation:updates');
  });

  it('defines USER_UPDATES channel', () => {
    expect(CHANNELS.USER_UPDATES).toBe('user:updates');
  });

  it('defines KNOWLEDGE_UPDATES channel', () => {
    expect(CHANNELS.KNOWLEDGE_UPDATES).toBe('knowledge:updates');
  });
});

describe('EVENTS', () => {
  it('defines COURSE_CREATED event', () => {
    expect(EVENTS.COURSE_CREATED).toBe('course.created');
  });

  it('defines COURSE_UPDATED event', () => {
    expect(EVENTS.COURSE_UPDATED).toBe('course.updated');
  });

  it('defines AGENT_MESSAGE_CREATED event', () => {
    expect(EVENTS.AGENT_MESSAGE_CREATED).toBe('agent.message.created');
  });

  it('defines ANNOTATION_CREATED event', () => {
    expect(EVENTS.ANNOTATION_CREATED).toBe('annotation.created');
  });

  it('defines USER_CREATED event', () => {
    expect(EVENTS.USER_CREATED).toBe('user.created');
  });
});
