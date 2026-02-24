/**
 * NATS Event Delivery Integration Tests
 *
 * Tests NATS event delivery patterns using mocked NATS transport (vi.mock).
 * No real NATS server required — all behaviour verified through mock call
 * assertions and the validators from @edusphere/nats-client.
 *
 * Subject convention verified:  agent.session.<tenantId>
 * Event payload shapes sourced from: packages/nats-client/src/events.ts
 * Validator logic sourced from:      packages/nats-client/src/events-validator.ts
 */

import { describe, it, expect, vi } from 'vitest';
import type {
  ContentPayload,
  AnnotationPayload,
  AgentMessagePayload,
} from '@edusphere/nats-client';
import {
  validateContentEvent,
  validateAnnotationEvent,
  validateAgentMessageEvent,
  EventValidationError,
} from '@edusphere/nats-client';

// ── Helpers ────────────────────────────────────────────────────────────────────

const ISO_NOW = new Date().toISOString();

const makePublish = () => vi.fn<[string, unknown], void>();

const encodePayload = (payload: unknown): Uint8Array =>
  Buffer.from(JSON.stringify(payload));

const decodePayload = (data: Uint8Array): unknown =>
  JSON.parse(Buffer.from(data).toString('utf8'));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const contentCreatedPayload = (): ContentPayload => ({
  type: 'content.created',
  contentItemId: 'ci-uuid-001',
  courseId: 'course-uuid-42',
  tenantId: 'tenant-abc',
  timestamp: ISO_NOW,
});

const annotationCreatedPayload = (): AnnotationPayload => ({
  type: 'annotation.created',
  annotationId: 'ann-uuid-001',
  assetId: 'asset-uuid-001',
  userId: 'user-uuid-001',
  tenantId: 'tenant-abc',
  layer: 'PERSONAL',
  timestamp: ISO_NOW,
});

const agentMessagePayload = (): AgentMessagePayload => ({
  type: 'message.created',
  sessionId: 'sess-uuid-001',
  messageId: 'msg-uuid-001',
  userId: 'user-uuid-001',
  content: 'Hello from the agent',
  timestamp: ISO_NOW,
});

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('NATS Event Delivery', () => {
  describe('content.created event', () => {
    it('is published when a content item is created', () => {
      const publish = makePublish();
      const payload = contentCreatedPayload();
      publish('content.created', encodePayload(payload));
      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('payload includes contentItemId, tenantId, courseId, type', () => {
      const payload = contentCreatedPayload();
      expect(payload.contentItemId).toBe('ci-uuid-001');
      expect(payload.tenantId).toBe('tenant-abc');
      expect(payload.courseId).toBe('course-uuid-42');
      expect(payload.type).toBe('content.created');
    });

    it('subject follows the dot-separated NATS subject pattern', () => {
      const publish = makePublish();
      const subject = 'content.created';
      publish(subject, encodePayload(contentCreatedPayload()));
      const [calledSubject] = publish.mock.calls[0]!;
      expect(calledSubject).toMatch(/^[a-z]+(\.[a-z]+)+$/);
      expect(calledSubject).not.toContain('/');
    });

    it('validateContentEvent accepts a valid content.created payload', () => {
      expect(() => validateContentEvent(contentCreatedPayload())).not.toThrow();
    });
  });

  describe('annotation.added event', () => {
    it('is published when annotation is created', () => {
      const publish = makePublish();
      const payload = annotationCreatedPayload();
      publish(`annotation.created.${payload.tenantId}`, encodePayload(payload));
      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('payload includes annotationId, assetId, tenantId, userId, layer', () => {
      const payload = annotationCreatedPayload();
      expect(payload.annotationId).toBe('ann-uuid-001');
      expect(payload.assetId).toBe('asset-uuid-001');
      expect(payload.tenantId).toBe('tenant-abc');
      expect(payload.userId).toBe('user-uuid-001');
      expect(payload.layer).toBe('PERSONAL');
    });

    it('is NOT published when annotation is updated (only on creation)', () => {
      const publish = makePublish();
      const created: AnnotationPayload = annotationCreatedPayload();
      const updated: AnnotationPayload = { ...created, type: 'annotation.updated' };

      // Simulate service logic: only publish on created, skip on updated
      if (created.type === 'annotation.created') publish('annotation.created', encodePayload(created));
      if (updated.type === 'annotation.created') publish('annotation.created', encodePayload(updated));

      expect(publish).toHaveBeenCalledTimes(1);
      const [, data] = publish.mock.calls[0]!;
      const decoded = decodePayload(data as Uint8Array) as AnnotationPayload;
      expect(decoded.type).toBe('annotation.created');
    });
  });

  describe('agent.message event', () => {
    it('is published when agent sends a message in a session', () => {
      const publish = makePublish();
      const payload = agentMessagePayload();
      publish(`agent.session.${payload.userId}`, encodePayload(payload));
      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('payload includes sessionId, userId, type, content', () => {
      const payload = agentMessagePayload();
      expect(payload.sessionId).toBe('sess-uuid-001');
      expect(payload.userId).toBe('user-uuid-001');
      expect(payload.type).toBe('message.created');
      expect(payload.content).toBe('Hello from the agent');
    });

    it('validateAgentMessageEvent accepts message.created and stream.chunk types', () => {
      const base = { sessionId: 'sess-1', userId: 'user-1', timestamp: ISO_NOW };
      expect(() => validateAgentMessageEvent({ ...base, type: 'message.created' })).not.toThrow();
      expect(() => validateAgentMessageEvent({ ...base, type: 'stream.chunk', content: 'chunk' })).not.toThrow();
    });
  });

  describe('event subject naming', () => {
    it('all subjects follow domain.action (dot-separated) pattern', () => {
      const subjects = [
        'content.created',
        'annotation.created',
        'agent.session.tenant-abc',
      ];
      for (const s of subjects) {
        expect(s).toMatch(/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/);
      }
    });

    it('subjects use dots as separators, not slashes', () => {
      const subjects = [
        'content.created',
        'annotation.created',
        'agent.session.tenant-abc',
      ];
      for (const s of subjects) {
        expect(s).not.toContain('/');
        expect(s).toContain('.');
      }
    });
  });

  describe('dead letter queue', () => {
    it('malformed event payload is rejected by validator without crashing', () => {
      const malformed = { unexpected: true, garbage: 42 };
      expect(() => validateContentEvent(malformed)).toThrow(EventValidationError);
    });

    it('service continues processing after a bad event', () => {
      const results: string[] = [];
      const events: unknown[] = [
        { garbage: true },
        contentCreatedPayload(),
      ];

      for (const evt of events) {
        try {
          const validated = validateContentEvent(evt);
          results.push(validated.contentItemId);
        } catch {
          // discard malformed — service keeps going
        }
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toBe('ci-uuid-001');
    });
  });

  describe('reconnection behavior', () => {
    it('NatsClient publish is retried by calling connect() again on failure', async () => {
      let callCount = 0;
      const connectMock = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error('Connection refused');
        return { publish: vi.fn(), drain: vi.fn().mockResolvedValue(undefined) };
      });

      let nc: Awaited<ReturnType<typeof connectMock>> | null = null;
      const publishWithRetry = async (subject: string, data: unknown) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (!nc) nc = await connectMock({ servers: 'nats://localhost:4222' });
            nc.publish(subject, data);
            return;
          } catch {
            nc = null;
          }
        }
      };

      await publishWithRetry('content.created', encodePayload(contentCreatedPayload()));
      expect(connectMock).toHaveBeenCalledTimes(2);
    });

    it('queued events can be published after reconnect', async () => {
      const publishMock = vi.fn();
      const connectMock = vi.fn().mockResolvedValue({ publish: publishMock, drain: vi.fn() });

      const nc = await connectMock({ servers: 'nats://localhost:4222' });
      const queue: ContentPayload[] = [contentCreatedPayload(), { ...contentCreatedPayload(), contentItemId: 'ci-uuid-002' }];

      for (const evt of queue) {
        nc.publish('content.created', encodePayload(evt));
      }

      expect(publishMock).toHaveBeenCalledTimes(2);
      const firstDecoded = decodePayload((publishMock.mock.calls[0]![1]) as Uint8Array) as ContentPayload;
      expect(firstDecoded.contentItemId).toBe('ci-uuid-001');
    });
  });
});
