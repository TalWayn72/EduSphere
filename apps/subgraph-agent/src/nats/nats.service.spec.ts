import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentSessionPayload } from '@edusphere/nats-client';
import { EventValidationError } from '@edusphere/nats-client';

// ─── NATS mock ────────────────────────────────────────────────────────────────
//
// We mock the `nats` package so unit tests run without a live NATS server.
// The mock exposes only the surface used by NatsService:
//   nc.publish(), nc.subscribe() → returns an async-iterable Subscription
//   nc.drain()
//   StringCodec().encode() / .decode()
//
// Each test that exercises subscribe() pushes message objects into
// `mockMessages` before creating the service so the async iterator yields them.

type MockMsg = { data: Uint8Array };

let mockPublish: ReturnType<typeof vi.fn>;
let mockDrain: ReturnType<typeof vi.fn>;
let mockUnsubscribe: ReturnType<typeof vi.fn>;

// The array of messages to emit from the mock subscription's async iterator.
// Populated per-test before calling service.subscribe().
const mockMessages: MockMsg[] = [];

vi.mock('nats', () => {
  const encode = (s: string): Uint8Array => Buffer.from(s);
  const decode = (b: Uint8Array): string => Buffer.from(b).toString('utf8');

  return {
    StringCodec: vi.fn(() => ({ encode, decode })),
    connect: vi.fn().mockImplementation(async () => {
      mockPublish = vi.fn();
      mockDrain = vi.fn().mockResolvedValue(undefined);
      mockUnsubscribe = vi.fn();

      return {
        publish: mockPublish,
        drain: mockDrain,
        subscribe: vi.fn().mockReturnValue({
          unsubscribe: mockUnsubscribe,
          // Async iterable that yields everything in mockMessages then stops.
          [Symbol.asyncIterator]() {
            let index = 0;
            return {
              next: async () => {
                if (index < mockMessages.length) {
                  return { value: mockMessages[index++], done: false };
                }
                // Return done so processMessages() loop exits.
                return { value: undefined as unknown as MockMsg, done: true };
              },
            };
          },
        }),
      };
    }),
  };
});

// Import the service AFTER the mock is registered.
import { NatsService } from './nats.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildEvent = (
  overrides: Partial<AgentSessionPayload> = {},
): AgentSessionPayload => ({
  type: 'session.created',
  sessionId: 'session-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  data: { agentType: 'TUTOR' },
  timestamp: new Date().toISOString(),
  ...overrides,
});

const encodeMsg = (payload: unknown): MockMsg => ({
  data: Buffer.from(JSON.stringify(payload)),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NatsService', () => {
  let service: NatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages.length = 0; // clear message queue
    service = new NatsService();
  });

  afterEach(async () => {
    // Drain the connection after each test.
    await service.onModuleDestroy();
  });

  // ── publish() ─────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('resolves without throwing for session.created event', async () => {
      const event = buildEvent({ type: 'session.created' });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('resolves without throwing for session.completed event', async () => {
      const event = buildEvent({ type: 'session.completed' });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('resolves without throwing for session.failed event', async () => {
      const event = buildEvent({ type: 'session.failed' });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('resolves without throwing for session.cancelled event', async () => {
      const event = buildEvent({ type: 'session.cancelled' });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('returns undefined (void) on success', async () => {
      const event = buildEvent();
      const result = await service.publish(event);
      expect(result).toBeUndefined();
    });

    it('accepts event with optional tenantId undefined', async () => {
      const event: AgentSessionPayload = {
        type: 'session.created',
        sessionId: 'session-1',
        userId: 'user-1',
        tenantId: undefined,
        data: {},
        timestamp: new Date().toISOString(),
      };
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('accepts event with complex data payload', async () => {
      const event = buildEvent({
        data: { courseId: 'course-1', topicId: 'topic-5', progress: 0.75 },
      });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });
  });

  // ── subscribe() ───────────────────────────────────────────────────────────

  describe('subscribe()', () => {
    it('resolves without throwing', async () => {
      const handler = vi.fn();
      const unsubscribe = await service.subscribe('agent.events', handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('returns a cleanup (unsubscribe) function', async () => {
      const handler = vi.fn();
      const unsubscribe = await service.subscribe('agent.events', handler);
      expect(typeof unsubscribe).toBe('function');
      // Calling the cleanup must not throw.
      expect(() => unsubscribe()).not.toThrow();
    });

    it('does not call handler during subscribe call itself', async () => {
      const handler = vi.fn();
      await service.subscribe('agent.events', handler);
      // The async iterator in the mock is empty so handler stays uncalled.
      expect(handler).not.toHaveBeenCalled();
    });

    it('accepts arbitrary NATS subject strings', async () => {
      const handler = vi.fn();
      const unsubscribe = await service.subscribe(
        'edusphere.agent.session.created',
        handler,
      );
      expect(typeof unsubscribe).toBe('function');
    });
  });

  // ── Contract Tests ────────────────────────────────────────────────────────

  describe('NatsService - Event Contract Tests', () => {
    it('publish() calls nc.publish with the correct subject (agent.session.<tenantId>)', async () => {
      const event = buildEvent({ tenantId: 'tenant-uuid' });
      await service.publish(event);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      const [subject] = mockPublish.mock.calls[0] as [string, Uint8Array];
      expect(subject).toBe('agent.session.tenant-uuid');
    });

    it('publish() uses "global" segment when tenantId is undefined', async () => {
      const event = buildEvent({ tenantId: undefined });
      await service.publish(event);

      const [subject] = mockPublish.mock.calls[0] as [string, Uint8Array];
      expect(subject).toBe('agent.session.global');
    });

    it('publish() encodes the event as JSON in the message body', async () => {
      const event = buildEvent({ tenantId: 'tenant-abc' });
      await service.publish(event);

      const [, data] = mockPublish.mock.calls[0] as [string, Uint8Array];
      const decoded = JSON.parse(Buffer.from(data).toString('utf8')) as unknown;
      expect(decoded).toMatchObject({
        type: event.type,
        sessionId: event.sessionId,
        userId: event.userId,
        tenantId: event.tenantId,
      });
    });

    it('subscribe() calls validateAgentSessionEvent on a valid incoming message and invokes handler', async () => {
      const validPayload = buildEvent({ type: 'session.completed' });
      mockMessages.push(encodeMsg(validPayload));

      const handler = vi.fn().mockResolvedValue(undefined);
      await service.subscribe('agent.session.tenant-1', handler);

      // Allow the async processMessages loop to run.
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session.completed',
          sessionId: validPayload.sessionId,
        }),
      );
    });

    it('subscribe() does NOT call handler when message is malformed (missing sessionId)', async () => {
      // Missing required sessionId → validateAgentSessionEvent must throw EventValidationError.
      const malformed = {
        type: 'session.created',
        userId: 'user-1',
        tenantId: 'tenant-1',
        data: {},
        timestamp: new Date().toISOString(),
        // sessionId intentionally omitted
      };
      mockMessages.push(encodeMsg(malformed));

      const handler = vi.fn();
      await service.subscribe('agent.session.tenant-1', handler);

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(handler).not.toHaveBeenCalled();
    });

    it('subscribe() does NOT call handler when message has invalid event type', async () => {
      const badType = {
        type: 'session.unknown', // not a valid AgentEventType
        sessionId: 'session-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        data: {},
        timestamp: new Date().toISOString(),
      };
      mockMessages.push(encodeMsg(badType));

      const handler = vi.fn();
      await service.subscribe('agent.session.tenant-1', handler);

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(handler).not.toHaveBeenCalled();
    });

    it('subscribe() does NOT call handler when message body is not valid JSON', async () => {
      // Inject a raw Uint8Array that is not valid JSON.
      mockMessages.push({ data: Buffer.from('not-json!!!') });

      const handler = vi.fn();
      await service.subscribe('agent.session.tenant-1', handler);

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(handler).not.toHaveBeenCalled();
    });

    it('subscribe() handles multiple valid messages in sequence', async () => {
      const e1 = buildEvent({ type: 'session.created', sessionId: 'sess-A' });
      const e2 = buildEvent({ type: 'session.completed', sessionId: 'sess-B' });
      mockMessages.push(encodeMsg(e1), encodeMsg(e2));

      const handler = vi.fn().mockResolvedValue(undefined);
      await service.subscribe('agent.session.tenant-1', handler);

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('subscribe() continues processing after a malformed message', async () => {
      const bad = { type: 'invalid', data: {} }; // missing required fields
      const good = buildEvent({ type: 'session.failed' });
      mockMessages.push(encodeMsg(bad), encodeMsg(good));

      const handler = vi.fn().mockResolvedValue(undefined);
      await service.subscribe('agent.session.tenant-1', handler);

      await new Promise<void>((resolve) => setImmediate(resolve));

      // Only the valid message triggers the handler.
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'session.failed' }),
      );
    });

    it('onModuleDestroy() drains the NATS connection', async () => {
      // Trigger lazy connection by publishing.
      await service.publish(buildEvent());
      await service.onModuleDestroy();

      expect(mockDrain).toHaveBeenCalledTimes(1);
    });

    it('onModuleDestroy() is a no-op when never connected', async () => {
      // New service — no publish/subscribe called, so no connection established.
      const fresh = new NatsService();
      await expect(fresh.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('EventValidationError has correct shape when triggered by malformed payload', () => {
      // Direct unit test for the error class imported from @edusphere/nats-client.
      const err = new EventValidationError('agent.session.*', {}, [
        'sessionId must be a non-empty string',
      ]);
      expect(err).toBeInstanceOf(EventValidationError);
      expect(err.violations).toContain('sessionId must be a non-empty string');
      expect(err.channel).toBe('agent.session.*');
      expect(err.name).toBe('EventValidationError');
    });
  });
});
