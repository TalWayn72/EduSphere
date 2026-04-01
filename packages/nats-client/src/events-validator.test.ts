import { describe, it, expect } from 'vitest';
import {
  EventValidationError,
  validateAgentSessionEvent,
  validateAgentMessageEvent,
  validateAnnotationEvent,
  validateContentEvent,
} from './events-validator';

// ---------------------------------------------------------------------------
// EventValidationError
// ---------------------------------------------------------------------------

describe('EventValidationError', () => {
  it('stores channel, payload, and violations', () => {
    const err = new EventValidationError('test.channel', { bad: true }, [
      'missing field',
    ]);
    expect(err.name).toBe('EventValidationError');
    expect(err.channel).toBe('test.channel');
    expect(err.payload).toEqual({ bad: true });
    expect(err.violations).toEqual(['missing field']);
    expect(err.message).toContain("'test.channel'");
    expect(err.message).toContain('missing field');
  });

  it('joins multiple violations with semicolons', () => {
    const err = new EventValidationError('ch', {}, ['a', 'b', 'c']);
    expect(err.message).toContain('a; b; c');
  });
});

// ---------------------------------------------------------------------------
// validateAgentSessionEvent
// ---------------------------------------------------------------------------

describe('validateAgentSessionEvent', () => {
  const validPayload = {
    sessionId: 'sess-1',
    userId: 'user-1',
    type: 'session.created',
    timestamp: '2026-03-30T12:00:00Z',
  };

  it('returns payload when valid', () => {
    expect(validateAgentSessionEvent(validPayload)).toBe(validPayload);
  });

  it('throws for null payload', () => {
    expect(() => validateAgentSessionEvent(null)).toThrow(EventValidationError);
  });

  it('throws for non-object payload', () => {
    expect(() => validateAgentSessionEvent('string')).toThrow(
      EventValidationError
    );
  });

  it('throws when sessionId is missing', () => {
    const payload = { ...validPayload, sessionId: '' };
    expect(() => validateAgentSessionEvent(payload)).toThrow(
      'sessionId must be a non-empty string'
    );
  });

  it('throws when type is invalid', () => {
    const payload = { ...validPayload, type: 'invalid.type' };
    expect(() => validateAgentSessionEvent(payload)).toThrow(
      'type must be one of'
    );
  });

  it('throws when timestamp is not valid ISO date', () => {
    const payload = { ...validPayload, timestamp: 'not-a-date' };
    expect(() => validateAgentSessionEvent(payload)).toThrow(
      'timestamp must be a valid ISO 8601'
    );
  });

  it('collects multiple violations at once', () => {
    try {
      validateAgentSessionEvent({ type: 'bad' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EventValidationError);
      const ve = err as EventValidationError;
      expect(ve.violations.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ---------------------------------------------------------------------------
// validateAgentMessageEvent
// ---------------------------------------------------------------------------

describe('validateAgentMessageEvent', () => {
  const validPayload = {
    sessionId: 'sess-1',
    userId: 'user-1',
    type: 'message.created',
  };

  it('returns payload when valid', () => {
    expect(validateAgentMessageEvent(validPayload)).toBe(validPayload);
  });

  it('throws when sessionId is empty', () => {
    expect(() =>
      validateAgentMessageEvent({ ...validPayload, sessionId: '' })
    ).toThrow('sessionId');
  });

  it('throws when userId is missing', () => {
    expect(() =>
      validateAgentMessageEvent({ ...validPayload, userId: undefined })
    ).toThrow('userId');
  });

  it('throws for invalid message type', () => {
    expect(() =>
      validateAgentMessageEvent({ ...validPayload, type: 'bad' })
    ).toThrow('type must be one of');
  });

  it('accepts all valid message types', () => {
    for (const type of [
      'message.created',
      'stream.chunk',
      'stream.end',
      'stream.error',
    ]) {
      expect(() =>
        validateAgentMessageEvent({ ...validPayload, type })
      ).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// validateAnnotationEvent
// ---------------------------------------------------------------------------

describe('validateAnnotationEvent', () => {
  const validPayload = {
    annotationId: 'ann-1',
    assetId: 'asset-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    type: 'annotation.created',
  };

  it('returns payload when valid', () => {
    expect(validateAnnotationEvent(validPayload)).toBe(validPayload);
  });

  it('throws when annotationId is missing', () => {
    expect(() =>
      validateAnnotationEvent({ ...validPayload, annotationId: '' })
    ).toThrow('annotationId');
  });

  it('throws when assetId is missing', () => {
    expect(() =>
      validateAnnotationEvent({ ...validPayload, assetId: '' })
    ).toThrow('assetId');
  });

  it('throws when tenantId is missing', () => {
    expect(() =>
      validateAnnotationEvent({ ...validPayload, tenantId: '' })
    ).toThrow('tenantId');
  });

  it('throws for invalid annotation type', () => {
    expect(() =>
      validateAnnotationEvent({ ...validPayload, type: 'annotation.archived' })
    ).toThrow('type must be one of');
  });

  it('accepts all valid annotation types', () => {
    for (const type of [
      'annotation.created',
      'annotation.updated',
      'annotation.deleted',
      'annotation.resolved',
    ]) {
      expect(() =>
        validateAnnotationEvent({ ...validPayload, type })
      ).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// validateContentEvent
// ---------------------------------------------------------------------------

describe('validateContentEvent', () => {
  const validPayload = {
    contentItemId: 'content-1',
    tenantId: 'tenant-1',
    type: 'content.created',
  };

  it('returns payload when valid', () => {
    expect(validateContentEvent(validPayload)).toBe(validPayload);
  });

  it('throws when contentItemId is empty', () => {
    expect(() =>
      validateContentEvent({ ...validPayload, contentItemId: '' })
    ).toThrow('contentItemId');
  });

  it('throws when tenantId is empty', () => {
    expect(() =>
      validateContentEvent({ ...validPayload, tenantId: '' })
    ).toThrow('tenantId');
  });

  it('throws for invalid content type', () => {
    expect(() =>
      validateContentEvent({ ...validPayload, type: 'content.archived' })
    ).toThrow('type must be a valid ContentEventType');
  });

  it('accepts all valid content types', () => {
    for (const type of [
      'content.created',
      'content.updated',
      'content.deleted',
      'content.published',
      'content.transcription.completed',
    ]) {
      expect(() =>
        validateContentEvent({ ...validPayload, type })
      ).not.toThrow();
    }
  });
});
