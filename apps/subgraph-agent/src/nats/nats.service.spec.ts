import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NatsService, type AgentEvent } from './nats.service';

describe('NatsService', () => {
  let service: NatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NatsService();
  });

  const buildEvent = (overrides: Partial<AgentEvent> = {}): AgentEvent => ({
    type: 'session.created',
    sessionId: 'session-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    data: { agentType: 'TUTOR' },
    timestamp: new Date(),
    ...overrides,
  });

  // ── publish ───────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('resolves without throwing for session.created event', async () => {
      const event = buildEvent({ type: 'session.created' });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('resolves without throwing for session.completed event', async () => {
      const event = buildEvent({ type: 'session.completed' });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('resolves without throwing for message.created event', async () => {
      const event = buildEvent({ type: 'message.created' });
      await expect(service.publish(event)).resolves.toBeUndefined();
    });

    it('returns undefined (void) on success', async () => {
      const event = buildEvent();
      const result = await service.publish(event);
      expect(result).toBeUndefined();
    });

    it('accepts event with optional tenantId undefined', async () => {
      const event: AgentEvent = {
        type: 'session.created',
        sessionId: 'session-1',
        userId: 'user-1',
        tenantId: undefined,
        data: {},
        timestamp: new Date(),
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

  // ── subscribe ─────────────────────────────────────────────────────────────

  describe('subscribe()', () => {
    it('resolves without throwing', async () => {
      const handler = vi.fn();
      await expect(service.subscribe('agent.events', handler)).resolves.toBeUndefined();
    });

    it('returns undefined (void) on success', async () => {
      const handler = vi.fn();
      const result = await service.subscribe('agent.events', handler);
      expect(result).toBeUndefined();
    });

    it('does not call handler during subscribe call', async () => {
      const handler = vi.fn();
      await service.subscribe('agent.events', handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('accepts arbitrary NATS subject strings', async () => {
      const handler = vi.fn();
      await expect(
        service.subscribe('edusphere.agent.session.created', handler)
      ).resolves.toBeUndefined();
    });
  });
});
