import { describe, it, expect } from 'vitest';
import {
  isSocialFeedItemEvent,
  isPeerReviewAssignedEvent,
  isPeerReviewCompletedEvent,
  isDiscussionReplyEvent,
  isUserFollowedEvent,
} from './social-events.js';

describe('social-events type guards', () => {
  describe('isSocialFeedItemEvent', () => {
    const valid = {
      actorId: 'u-001',
      tenantId: 't-001',
      verb: 'COMPLETED' as const,
      objectType: 'course',
      objectId: 'c-001',
      objectTitle: 'Intro to Math',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid feed item', () => {
      expect(isSocialFeedItemEvent(valid)).toBe(true);
    });

    it('returns true for all verb types', () => {
      for (const verb of [
        'COMPLETED',
        'ENROLLED',
        'ACHIEVED_BADGE',
        'DISCUSSED',
        'STARTED_LEARNING',
      ]) {
        expect(isSocialFeedItemEvent({ ...valid, verb })).toBe(true);
      }
    });

    it('returns false for null', () => {
      expect(isSocialFeedItemEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSocialFeedItemEvent(undefined)).toBe(false);
    });

    it('returns false when actorId missing', () => {
      const { actorId: _, ...rest } = valid;
      expect(isSocialFeedItemEvent(rest)).toBe(false);
    });

    it('returns false when tenantId missing', () => {
      const { tenantId: _, ...rest } = valid;
      expect(isSocialFeedItemEvent(rest)).toBe(false);
    });

    it('returns false when objectId missing', () => {
      const { objectId: _, ...rest } = valid;
      expect(isSocialFeedItemEvent(rest)).toBe(false);
    });

    it('returns false for non-string actorId', () => {
      expect(isSocialFeedItemEvent({ ...valid, actorId: 42 })).toBe(false);
    });
  });

  describe('isPeerReviewAssignedEvent', () => {
    const valid = {
      assignmentId: 'asgn-001',
      reviewerId: 'u-001',
      submitterId: 'u-002',
      contentItemTitle: 'Essay',
      tenantId: 't-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid event', () => {
      expect(isPeerReviewAssignedEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPeerReviewAssignedEvent(null)).toBe(false);
    });

    it('returns false when assignmentId missing', () => {
      const { assignmentId: _, ...rest } = valid;
      expect(isPeerReviewAssignedEvent(rest)).toBe(false);
    });

    it('returns false when reviewerId missing', () => {
      const { reviewerId: _, ...rest } = valid;
      expect(isPeerReviewAssignedEvent(rest)).toBe(false);
    });

    it('returns false when submitterId missing', () => {
      const { submitterId: _, ...rest } = valid;
      expect(isPeerReviewAssignedEvent(rest)).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isPeerReviewAssignedEvent({ ...valid, assignmentId: 0 })).toBe(
        false
      );
    });
  });

  describe('isPeerReviewCompletedEvent', () => {
    const valid = {
      assignmentId: 'asgn-001',
      submitterId: 'u-002',
      contentItemTitle: 'Essay',
      tenantId: 't-001',
      reviewCount: 3,
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid event', () => {
      expect(isPeerReviewCompletedEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPeerReviewCompletedEvent(null)).toBe(false);
    });

    it('returns false when reviewCount is not a number', () => {
      expect(isPeerReviewCompletedEvent({ ...valid, reviewCount: '3' })).toBe(
        false
      );
    });

    it('returns false when submitterId missing', () => {
      const { submitterId: _, ...rest } = valid;
      expect(isPeerReviewCompletedEvent(rest)).toBe(false);
    });
  });

  describe('isDiscussionReplyEvent', () => {
    const valid = {
      discussionId: 'd-001',
      messageId: 'm-001',
      authorId: 'u-001',
      recipientId: 'u-002',
      discussionTitle: 'Topic A',
      tenantId: 't-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid event', () => {
      expect(isDiscussionReplyEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDiscussionReplyEvent(null)).toBe(false);
    });

    it('returns false when discussionId missing', () => {
      const { discussionId: _, ...rest } = valid;
      expect(isDiscussionReplyEvent(rest)).toBe(false);
    });

    it('returns false when messageId missing', () => {
      const { messageId: _, ...rest } = valid;
      expect(isDiscussionReplyEvent(rest)).toBe(false);
    });

    it('returns false when recipientId missing', () => {
      const { recipientId: _, ...rest } = valid;
      expect(isDiscussionReplyEvent(rest)).toBe(false);
    });
  });

  describe('isUserFollowedEvent', () => {
    const valid = {
      followerId: 'u-001',
      followingId: 'u-002',
      tenantId: 't-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid event', () => {
      expect(isUserFollowedEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isUserFollowedEvent(null)).toBe(false);
    });

    it('returns false when followerId missing', () => {
      const { followerId: _, ...rest } = valid;
      expect(isUserFollowedEvent(rest)).toBe(false);
    });

    it('returns false when followingId missing', () => {
      const { followingId: _, ...rest } = valid;
      expect(isUserFollowedEvent(rest)).toBe(false);
    });

    it('returns false when tenantId missing', () => {
      const { tenantId: _, ...rest } = valid;
      expect(isUserFollowedEvent(rest)).toBe(false);
    });

    it('returns false for non-string followerId', () => {
      expect(isUserFollowedEvent({ ...valid, followerId: 42 })).toBe(false);
    });
  });
});
