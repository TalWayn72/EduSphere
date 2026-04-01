import { describe, it, expect } from 'vitest';
import {
  isGatewayPubSubEvent,
  isSubmissionCreatedEvent,
  isPollVoteEvent,
  NatsSubjects,
} from './gateway-events.js';

describe('gateway-events type guards', () => {
  describe('isGatewayPubSubEvent', () => {
    const valid = { topic: 'user.updated', data: { userId: 'u-001' } };

    it('returns true for valid event', () => {
      expect(isGatewayPubSubEvent(valid)).toBe(true);
    });

    it('returns true with empty data object', () => {
      expect(isGatewayPubSubEvent({ topic: 'test', data: {} })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isGatewayPubSubEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isGatewayPubSubEvent(undefined)).toBe(false);
    });

    it('returns false when topic missing', () => {
      expect(isGatewayPubSubEvent({ data: {} })).toBe(false);
    });

    it('returns false when data is null', () => {
      expect(isGatewayPubSubEvent({ topic: 'test', data: null })).toBe(false);
    });

    it('returns false when data is not an object', () => {
      expect(isGatewayPubSubEvent({ topic: 'test', data: 'str' })).toBe(false);
    });

    it('returns false when topic is not a string', () => {
      expect(isGatewayPubSubEvent({ topic: 42, data: {} })).toBe(false);
    });
  });

  describe('isSubmissionCreatedEvent', () => {
    const valid = {
      submissionId: 's-001',
      tenantId: 't-001',
      courseId: 'c-001',
      userId: 'u-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid event', () => {
      expect(isSubmissionCreatedEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSubmissionCreatedEvent(null)).toBe(false);
    });

    it('returns false when submissionId missing', () => {
      const { submissionId: _, ...rest } = valid;
      expect(isSubmissionCreatedEvent(rest)).toBe(false);
    });

    it('returns false when tenantId missing', () => {
      const { tenantId: _, ...rest } = valid;
      expect(isSubmissionCreatedEvent(rest)).toBe(false);
    });

    it('returns false when courseId missing', () => {
      const { courseId: _, ...rest } = valid;
      expect(isSubmissionCreatedEvent(rest)).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isSubmissionCreatedEvent({ ...valid, submissionId: 0 })).toBe(
        false
      );
    });

    it('returns false for empty object', () => {
      expect(isSubmissionCreatedEvent({})).toBe(false);
    });
  });

  describe('isPollVoteEvent', () => {
    const valid = {
      pollId: 'poll-001',
      sessionId: 'sess-001',
      tenantId: 't-001',
      optionIndex: 2,
      totalVotes: 15,
      results: [
        { optionIndex: 0, count: 5 },
        { optionIndex: 1, count: 10 },
      ],
    };

    it('returns true for valid event', () => {
      expect(isPollVoteEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPollVoteEvent(null)).toBe(false);
    });

    it('returns false when pollId missing', () => {
      const { pollId: _, ...rest } = valid;
      expect(isPollVoteEvent(rest)).toBe(false);
    });

    it('returns false when sessionId missing', () => {
      const { sessionId: _, ...rest } = valid;
      expect(isPollVoteEvent(rest)).toBe(false);
    });

    it('returns false when totalVotes is not a number', () => {
      expect(isPollVoteEvent({ ...valid, totalVotes: '15' })).toBe(false);
    });

    it('returns false when tenantId missing', () => {
      const { tenantId: _, ...rest } = valid;
      expect(isPollVoteEvent(rest)).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isPollVoteEvent({})).toBe(false);
    });
  });

  describe('NatsSubjects', () => {
    it('contains POLL_VOTED subject', () => {
      expect(NatsSubjects.POLL_VOTED).toBe('EDUSPHERE.poll.voted');
    });

    it('contains COURSE_ENROLLED subject', () => {
      expect(NatsSubjects.COURSE_ENROLLED).toBe('EDUSPHERE.course.enrolled');
    });

    it('contains BADGE_ISSUED subject', () => {
      expect(NatsSubjects.BADGE_ISSUED).toBe('EDUSPHERE.badge.issued');
    });

    it('contains LESSON_CREATED subject', () => {
      expect(NatsSubjects.LESSON_CREATED).toBe('EDUSPHERE.lesson.created');
    });

    it('contains NOTIFICATION_DISPATCH subject', () => {
      expect(NatsSubjects.NOTIFICATION_DISPATCH).toBe(
        'EDUSPHERE.notification.dispatch'
      );
    });

    it('contains ADMIN_ALERT subject', () => {
      expect(NatsSubjects.ADMIN_ALERT).toBe('EDUSPHERE.admin.alert');
    });

    it('all subjects start with EDUSPHERE prefix', () => {
      for (const value of Object.values(NatsSubjects)) {
        expect(value).toMatch(/^EDUSPHERE\./);
      }
    });

    it('has expected number of subjects', () => {
      expect(Object.keys(NatsSubjects).length).toBeGreaterThanOrEqual(18);
    });
  });
});
