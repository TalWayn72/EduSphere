import { describe, it, expect } from 'vitest';
import {
  isAgentSessionEvent,
  isAgentMessageEvent,
  isAnnotationEvent,
  isContentEvent,
  isGatewayPubSubEvent,
  isTranscriptionEvent,
  isKnowledgeConceptEvent,
} from './events.js';
import {
  EventValidationError,
  validateAgentSessionEvent,
  validateAgentMessageEvent,
  validateAnnotationEvent,
  validateContentEvent,
} from './events-validator.js';

// ─── Type Guards ──────────────────────────────────────────────────────────────

describe('Type Guards', () => {
  describe('isAgentSessionEvent', () => {
    it('returns true for session.created', () => {
      expect(
        isAgentSessionEvent({
          type: 'session.created',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          data: {},
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns true for session.completed', () => {
      expect(
        isAgentSessionEvent({
          type: 'session.completed',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          data: {},
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns true for session.failed', () => {
      expect(
        isAgentSessionEvent({
          type: 'session.failed',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          data: {},
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns true for session.cancelled', () => {
      expect(
        isAgentSessionEvent({
          type: 'session.cancelled',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          data: {},
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns false for annotation event', () => {
      expect(
        isAgentSessionEvent({
          type: 'annotation.created',
          annotationId: 'uuid-1',
          assetId: 'uuid-2',
          userId: 'uuid-3',
          tenantId: 'uuid-4',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAgentSessionEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAgentSessionEvent(undefined)).toBe(false);
    });

    it('returns false for non-object primitive', () => {
      expect(isAgentSessionEvent('string')).toBe(false);
    });

    it('returns false when sessionId is missing', () => {
      expect(
        isAgentSessionEvent({ type: 'session.created', userId: 'uuid' })
      ).toBe(false);
    });

    it('returns false when userId is missing', () => {
      expect(
        isAgentSessionEvent({ type: 'session.created', sessionId: 'uuid' })
      ).toBe(false);
    });

    it('returns false when type is not a valid agent session type', () => {
      expect(
        isAgentSessionEvent({
          type: 'message.created',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
        })
      ).toBe(false);
    });
  });

  describe('isAgentMessageEvent', () => {
    it('returns true for stream.chunk', () => {
      expect(
        isAgentMessageEvent({
          type: 'stream.chunk',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          content: 'Hello',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns true for message.created', () => {
      expect(
        isAgentMessageEvent({
          type: 'message.created',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns true for stream.end', () => {
      expect(
        isAgentMessageEvent({
          type: 'stream.end',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns true for stream.error', () => {
      expect(
        isAgentMessageEvent({
          type: 'stream.error',
          sessionId: 'uuid-1',
          userId: 'uuid-2',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns false when sessionId is missing', () => {
      expect(
        isAgentMessageEvent({ type: 'stream.chunk', userId: 'uuid' })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAgentMessageEvent(null)).toBe(false);
    });

    it('returns false for invalid type', () => {
      expect(
        isAgentMessageEvent({ type: 'session.created', sessionId: 'uuid' })
      ).toBe(false);
    });
  });

  describe('isAnnotationEvent', () => {
    it('returns true for valid annotation event', () => {
      expect(
        isAnnotationEvent({
          type: 'annotation.created',
          annotationId: 'uuid-1',
          assetId: 'uuid-2',
          userId: 'uuid-3',
          tenantId: 'uuid-4',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns false when annotationId is missing', () => {
      expect(isAnnotationEvent({ assetId: 'uuid' })).toBe(false);
    });

    it('returns false when assetId is missing', () => {
      expect(isAnnotationEvent({ annotationId: 'uuid' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAnnotationEvent(null)).toBe(false);
    });
  });

  describe('isContentEvent', () => {
    it('returns true for valid content event', () => {
      expect(
        isContentEvent({
          type: 'content.created',
          contentItemId: 'uuid-1',
          tenantId: 'uuid-2',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toBe(true);
    });

    it('returns false when contentItemId is missing', () => {
      expect(isContentEvent({ tenantId: 'uuid' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isContentEvent(null)).toBe(false);
    });
  });

  describe('isGatewayPubSubEvent', () => {
    it('returns true for valid gateway pub/sub event', () => {
      expect(
        isGatewayPubSubEvent({ topic: 'annotation-added', data: {} })
      ).toBe(true);
    });

    it('returns true when data has properties', () => {
      expect(
        isGatewayPubSubEvent({
          topic: 'annotationAdded_asset-uuid',
          data: { annotationId: 'uuid-1' },
        })
      ).toBe(true);
    });

    it('returns false when topic is missing', () => {
      expect(isGatewayPubSubEvent({ data: {} })).toBe(false);
    });

    it('returns false when data is missing', () => {
      expect(isGatewayPubSubEvent({ topic: 'my-topic' })).toBe(false);
    });

    it('returns false when data is null', () => {
      expect(isGatewayPubSubEvent({ topic: 'my-topic', data: null })).toBe(
        false
      );
    });

    it('returns false for null', () => {
      expect(isGatewayPubSubEvent(null)).toBe(false);
    });
  });

  describe('isTranscriptionEvent', () => {
    it('returns true for transcription.completed', () => {
      expect(
        isTranscriptionEvent({
          type: 'transcription.completed',
          assetId: 'uuid-1',
          segmentCount: 42,
        })
      ).toBe(true);
    });

    it('returns true for transcription.failed', () => {
      expect(
        isTranscriptionEvent({
          type: 'transcription.failed',
          assetId: 'uuid-1',
          errorMessage: 'GPU OOM',
        })
      ).toBe(true);
    });

    it('returns false when assetId is missing', () => {
      expect(isTranscriptionEvent({ type: 'transcription.completed' })).toBe(
        false
      );
    });

    it('returns false for null', () => {
      expect(isTranscriptionEvent(null)).toBe(false);
    });
  });

  describe('isKnowledgeConceptEvent', () => {
    it('returns true for knowledge.concepts.extracted', () => {
      expect(
        isKnowledgeConceptEvent({
          type: 'knowledge.concepts.extracted',
          assetId: 'uuid-1',
          concepts: [{ name: 'Machine Learning' }],
        })
      ).toBe(true);
    });

    it('returns true for knowledge.concepts.persisted with empty concepts array', () => {
      expect(
        isKnowledgeConceptEvent({
          type: 'knowledge.concepts.persisted',
          assetId: 'uuid-1',
          concepts: [],
        })
      ).toBe(true);
    });

    it('returns false when concepts is not an array', () => {
      expect(
        isKnowledgeConceptEvent({
          type: 'knowledge.concepts.extracted',
          assetId: 'uuid-1',
          concepts: 'not-array',
        })
      ).toBe(false);
    });

    it('returns false when assetId is missing', () => {
      expect(
        isKnowledgeConceptEvent({
          type: 'knowledge.concepts.extracted',
          concepts: [],
        })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isKnowledgeConceptEvent(null)).toBe(false);
    });
  });
});

// ─── Event Validators ─────────────────────────────────────────────────────────

describe('Event Validators', () => {
  describe('validateAgentSessionEvent', () => {
    it('returns valid payload unchanged', () => {
      const payload = {
        type: 'session.created' as const,
        sessionId: 'session-uuid',
        userId: 'user-uuid',
        data: { model: 'gpt-4', agentType: 'TUTOR' },
        timestamp: '2026-01-01T00:00:00Z',
      };
      const result = validateAgentSessionEvent(payload);
      expect(result).toBe(payload);
    });

    it('accepts optional tenantId', () => {
      const payload = {
        type: 'session.completed' as const,
        sessionId: 'session-uuid',
        userId: 'user-uuid',
        tenantId: 'tenant-uuid',
        data: { status: 'COMPLETED' },
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAgentSessionEvent(payload)).toBe(payload);
    });

    it('accepts session.failed type', () => {
      const payload = {
        type: 'session.failed' as const,
        sessionId: 'uuid',
        userId: 'uuid',
        data: {},
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAgentSessionEvent(payload)).toBe(payload);
    });

    it('accepts session.cancelled type', () => {
      const payload = {
        type: 'session.cancelled' as const,
        sessionId: 'uuid',
        userId: 'uuid',
        data: {},
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAgentSessionEvent(payload)).toBe(payload);
    });

    it('throws EventValidationError when sessionId is missing', () => {
      expect(() =>
        validateAgentSessionEvent({
          type: 'session.created',
          userId: 'user-uuid',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toThrow(EventValidationError);
    });

    it('throws EventValidationError when userId is missing', () => {
      expect(() =>
        validateAgentSessionEvent({
          type: 'session.created',
          sessionId: 'uuid',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when type is invalid', () => {
      expect(() =>
        validateAgentSessionEvent({
          type: 'invalid.type',
          sessionId: 'uuid',
          userId: 'uuid',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when timestamp is not a valid ISO date', () => {
      expect(() =>
        validateAgentSessionEvent({
          type: 'session.created',
          sessionId: 'uuid',
          userId: 'uuid',
          timestamp: 'not-a-date',
        })
      ).toThrow(EventValidationError);
    });

    it('throws for null payload', () => {
      expect(() => validateAgentSessionEvent(null)).toThrow(
        EventValidationError
      );
    });

    it('throws for non-object payload', () => {
      expect(() => validateAgentSessionEvent('invalid')).toThrow(
        EventValidationError
      );
    });

    it('includes violation details in error', () => {
      try {
        validateAgentSessionEvent({
          type: 'invalid.type',
          userId: 'uid',
          timestamp: 'bad-date',
        });
      } catch (e) {
        expect(e).toBeInstanceOf(EventValidationError);
        const err = e as EventValidationError;
        expect(err.violations.length).toBeGreaterThan(0);
        expect(err.channel).toBe('agent.session.*');
        expect(err.payload).toBeDefined();
      }
    });

    it('accumulates multiple violations', () => {
      try {
        validateAgentSessionEvent({});
      } catch (e) {
        expect(e).toBeInstanceOf(EventValidationError);
        const err = e as EventValidationError;
        // sessionId, userId, type, and timestamp should all fail
        expect(err.violations.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('throws when sessionId is empty string', () => {
      expect(() =>
        validateAgentSessionEvent({
          type: 'session.created',
          sessionId: '',
          userId: 'uuid',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toThrow(EventValidationError);
    });
  });

  describe('validateAgentMessageEvent', () => {
    it('returns valid stream chunk payload', () => {
      const payload = {
        type: 'stream.chunk' as const,
        sessionId: 'session-uuid',
        userId: 'user-uuid',
        content: 'Hello world',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAgentMessageEvent(payload)).toBe(payload);
    });

    it('returns valid message.created payload', () => {
      const payload = {
        type: 'message.created' as const,
        sessionId: 'session-uuid',
        userId: 'user-uuid',
        messageId: 'msg-uuid',
        tokenCount: 150,
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAgentMessageEvent(payload)).toBe(payload);
    });

    it('returns valid stream.end payload', () => {
      const payload = {
        type: 'stream.end' as const,
        sessionId: 'uuid',
        userId: 'uuid',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAgentMessageEvent(payload)).toBe(payload);
    });

    it('returns valid stream.error payload', () => {
      const payload = {
        type: 'stream.error' as const,
        sessionId: 'uuid',
        userId: 'uuid',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAgentMessageEvent(payload)).toBe(payload);
    });

    it('throws when sessionId is missing', () => {
      expect(() =>
        validateAgentMessageEvent({
          type: 'stream.chunk',
          userId: 'uuid',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when userId is missing', () => {
      expect(() =>
        validateAgentMessageEvent({
          type: 'stream.chunk',
          sessionId: 'uuid',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when type is invalid', () => {
      expect(() =>
        validateAgentMessageEvent({
          type: 'session.created',
          sessionId: 'uuid',
          userId: 'uuid',
        })
      ).toThrow(EventValidationError);
    });

    it('throws for null', () => {
      expect(() => validateAgentMessageEvent(null)).toThrow(
        EventValidationError
      );
    });
  });

  describe('validateAnnotationEvent', () => {
    it('returns valid payload', () => {
      const payload = {
        type: 'annotation.created' as const,
        annotationId: 'ann-uuid',
        assetId: 'asset-uuid',
        userId: 'user-uuid',
        tenantId: 'tenant-uuid',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAnnotationEvent(payload)).toBe(payload);
    });

    it('accepts optional layer', () => {
      const payload = {
        type: 'annotation.updated' as const,
        annotationId: 'uuid',
        assetId: 'uuid',
        userId: 'uuid',
        tenantId: 'uuid',
        layer: 'SHARED' as const,
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateAnnotationEvent(payload)).toBe(payload);
    });

    it('throws when tenantId is missing', () => {
      expect(() =>
        validateAnnotationEvent({
          type: 'annotation.created',
          annotationId: 'uuid',
          assetId: 'uuid',
          userId: 'uuid',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when type is invalid', () => {
      expect(() =>
        validateAnnotationEvent({
          type: 'not.valid',
          annotationId: 'uuid',
          assetId: 'uuid',
          userId: 'uuid',
          tenantId: 'uuid',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when annotationId is empty string', () => {
      expect(() =>
        validateAnnotationEvent({
          type: 'annotation.created',
          annotationId: '',
          assetId: 'uuid',
          userId: 'uuid',
          tenantId: 'uuid',
        })
      ).toThrow(EventValidationError);
    });

    it('throws for null', () => {
      expect(() => validateAnnotationEvent(null)).toThrow(EventValidationError);
    });

    it('throws for non-object', () => {
      expect(() => validateAnnotationEvent(42)).toThrow(EventValidationError);
    });

    it('sets correct channel in error', () => {
      try {
        validateAnnotationEvent({ annotationId: 'uuid' });
      } catch (e) {
        expect(e).toBeInstanceOf(EventValidationError);
        expect((e as EventValidationError).channel).toBe('annotation.*');
      }
    });
  });

  describe('validateContentEvent', () => {
    it('returns valid content.created payload', () => {
      const payload = {
        type: 'content.created' as const,
        contentItemId: 'content-uuid',
        tenantId: 'tenant-uuid',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateContentEvent(payload)).toBe(payload);
    });

    it('accepts optional courseId', () => {
      const payload = {
        type: 'content.published' as const,
        contentItemId: 'uuid',
        courseId: 'course-uuid',
        tenantId: 'uuid',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateContentEvent(payload)).toBe(payload);
    });

    it('accepts content.transcription.completed type', () => {
      const payload = {
        type: 'content.transcription.completed' as const,
        contentItemId: 'uuid',
        tenantId: 'uuid',
        timestamp: '2026-01-01T00:00:00Z',
      };
      expect(validateContentEvent(payload)).toBe(payload);
    });

    it('throws when contentItemId is missing', () => {
      expect(() =>
        validateContentEvent({
          type: 'content.created',
          tenantId: 'uuid',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when tenantId is missing', () => {
      expect(() =>
        validateContentEvent({
          type: 'content.created',
          contentItemId: 'uuid',
          timestamp: '2026-01-01T00:00:00Z',
        })
      ).toThrow(EventValidationError);
    });

    it('throws when type is invalid', () => {
      expect(() =>
        validateContentEvent({
          type: 'invalid.type',
          contentItemId: 'uuid',
          tenantId: 'uuid',
        })
      ).toThrow(EventValidationError);
    });

    it('throws for null', () => {
      expect(() => validateContentEvent(null)).toThrow(EventValidationError);
    });

    it('sets correct channel in error', () => {
      try {
        validateContentEvent({});
      } catch (e) {
        expect(e).toBeInstanceOf(EventValidationError);
        expect((e as EventValidationError).channel).toBe('content.*');
      }
    });
  });
});

// ─── EventValidationError ─────────────────────────────────────────────────────

describe('EventValidationError', () => {
  it('has correct name and properties', () => {
    const err = new EventValidationError('test.channel', { bad: 'data' }, [
      'field X missing',
    ]);
    expect(err.name).toBe('EventValidationError');
    expect(err.channel).toBe('test.channel');
    expect(err.violations).toEqual(['field X missing']);
    expect(err.message).toContain('test.channel');
    expect(err.message).toContain('field X missing');
  });

  it('is an instance of Error', () => {
    const err = new EventValidationError('ch', null, ['err']);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(EventValidationError);
  });

  it('joins multiple violations with semicolons in message', () => {
    const err = new EventValidationError('ch', null, [
      'field A missing',
      'field B invalid',
    ]);
    expect(err.message).toContain('field A missing');
    expect(err.message).toContain('field B invalid');
  });

  it('stores payload reference', () => {
    const payload = { some: 'data' };
    const err = new EventValidationError('ch', payload, ['err']);
    expect(err.payload).toBe(payload);
  });

  it('stores null payload', () => {
    const err = new EventValidationError('ch', null, [
      'payload must be object',
    ]);
    expect(err.payload).toBeNull();
  });

  it('has empty violations array when constructed with none', () => {
    const err = new EventValidationError('ch', {}, []);
    expect(err.violations).toEqual([]);
  });
});
