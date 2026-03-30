import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAgentSessionEvent,
  isAgentMessageEvent,
} from './agent-events.js';

describe('agent-events type guards', () => {
  describe('isAgentSessionEvent', () => {
    const validSession = {
      type: 'session.created',
      sessionId: 'sess-001',
      userId: 'user-001',
      data: {},
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for session.created', () => {
      expect(isAgentSessionEvent(validSession)).toBe(true);
    });

    it('returns true for session.completed', () => {
      expect(
        isAgentSessionEvent({ ...validSession, type: 'session.completed' })
      ).toBe(true);
    });

    it('returns true for session.failed', () => {
      expect(
        isAgentSessionEvent({ ...validSession, type: 'session.failed' })
      ).toBe(true);
    });

    it('returns true for session.cancelled', () => {
      expect(
        isAgentSessionEvent({ ...validSession, type: 'session.cancelled' })
      ).toBe(true);
    });

    it('returns false for unknown type', () => {
      expect(
        isAgentSessionEvent({ ...validSession, type: 'session.unknown' })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAgentSessionEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAgentSessionEvent(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isAgentSessionEvent('string')).toBe(false);
    });

    it('returns false when sessionId is missing', () => {
      const { sessionId: _, ...rest } = validSession;
      expect(isAgentSessionEvent(rest)).toBe(false);
    });

    it('returns false when userId is missing', () => {
      const { userId: _, ...rest } = validSession;
      expect(isAgentSessionEvent(rest)).toBe(false);
    });

    it('returns false when type is missing', () => {
      const { type: _, ...rest } = validSession;
      expect(isAgentSessionEvent(rest)).toBe(false);
    });

    it('returns false when sessionId is not a string', () => {
      expect(
        isAgentSessionEvent({ ...validSession, sessionId: 123 })
      ).toBe(false);
    });
  });

  describe('isAgentMessageEvent', () => {
    const validMessage = {
      type: 'message.created',
      sessionId: 'sess-001',
      messageId: 'msg-001',
      userId: 'user-001',
      content: 'Hello',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for message.created', () => {
      expect(isAgentMessageEvent(validMessage)).toBe(true);
    });

    it('returns true for stream.chunk', () => {
      expect(
        isAgentMessageEvent({ ...validMessage, type: 'stream.chunk' })
      ).toBe(true);
    });

    it('returns true for stream.end', () => {
      expect(
        isAgentMessageEvent({ ...validMessage, type: 'stream.end' })
      ).toBe(true);
    });

    it('returns true for stream.error', () => {
      expect(
        isAgentMessageEvent({ ...validMessage, type: 'stream.error' })
      ).toBe(true);
    });

    it('returns false for unknown type', () => {
      expect(
        isAgentMessageEvent({ ...validMessage, type: 'stream.unknown' })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAgentMessageEvent(null)).toBe(false);
    });

    it('returns false when sessionId is missing', () => {
      const { sessionId: _, ...rest } = validMessage;
      expect(isAgentMessageEvent(rest)).toBe(false);
    });

    it('returns false when sessionId is not a string', () => {
      expect(
        isAgentMessageEvent({ ...validMessage, sessionId: 42 })
      ).toBe(false);
    });

    it('accepts message without optional fields', () => {
      expect(
        isAgentMessageEvent({
          type: 'stream.chunk',
          sessionId: 'sess-001',
        })
      ).toBe(true);
    });
  });
});
