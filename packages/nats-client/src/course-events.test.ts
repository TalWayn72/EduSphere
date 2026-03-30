import { describe, it, expect } from 'vitest';
import {
  isCourseEnrolledEvent,
  isCourseCompletedEvent,
  isBadgeIssuedEvent,
  isBadgeRevokedEvent,
} from './course-events.js';

describe('course-events type guards', () => {
  describe('isCourseEnrolledEvent', () => {
    const valid = {
      courseId: 'c-001',
      userId: 'u-001',
      tenantId: 't-001',
      purchaseId: 'p-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid enrollment', () => {
      expect(isCourseEnrolledEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isCourseEnrolledEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isCourseEnrolledEvent(undefined)).toBe(false);
    });

    it('returns false when courseId missing', () => {
      const { courseId: _, ...rest } = valid;
      expect(isCourseEnrolledEvent(rest)).toBe(false);
    });

    it('returns false when userId missing', () => {
      const { userId: _, ...rest } = valid;
      expect(isCourseEnrolledEvent(rest)).toBe(false);
    });

    it('returns false when purchaseId missing', () => {
      const { purchaseId: _, ...rest } = valid;
      expect(isCourseEnrolledEvent(rest)).toBe(false);
    });

    it('returns false for non-string courseId', () => {
      expect(isCourseEnrolledEvent({ ...valid, courseId: 123 })).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isCourseEnrolledEvent({})).toBe(false);
    });
  });

  describe('isCourseCompletedEvent', () => {
    const valid = {
      courseId: 'c-001',
      userId: 'u-001',
      tenantId: 't-001',
      completionDate: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid completion', () => {
      expect(isCourseCompletedEvent(valid)).toBe(true);
    });

    it('returns true with optional fields', () => {
      expect(
        isCourseCompletedEvent({
          ...valid,
          certificateId: 'cert-001',
          courseTitle: 'Intro',
          estimatedHours: 5,
        })
      ).toBe(true);
    });

    it('returns false for null', () => {
      expect(isCourseCompletedEvent(null)).toBe(false);
    });

    it('returns false when completionDate missing', () => {
      const { completionDate: _, ...rest } = valid;
      expect(isCourseCompletedEvent(rest)).toBe(false);
    });

    it('returns false when tenantId missing', () => {
      const { tenantId: _, ...rest } = valid;
      expect(isCourseCompletedEvent(rest)).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isCourseCompletedEvent({ ...valid, courseId: 0 })).toBe(false);
    });
  });

  describe('isBadgeIssuedEvent', () => {
    const valid = {
      assertionId: 'a-001',
      badgeDefinitionId: 'bd-001',
      recipientId: 'r-001',
      tenantId: 't-001',
      badgeName: 'Expert',
      verifyUrl: 'https://example.com/verify',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid badge issued event', () => {
      expect(isBadgeIssuedEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isBadgeIssuedEvent(null)).toBe(false);
    });

    it('returns false when assertionId missing', () => {
      const { assertionId: _, ...rest } = valid;
      expect(isBadgeIssuedEvent(rest)).toBe(false);
    });

    it('returns false when recipientId missing', () => {
      const { recipientId: _, ...rest } = valid;
      expect(isBadgeIssuedEvent(rest)).toBe(false);
    });

    it('returns false when badgeName missing', () => {
      const { badgeName: _, ...rest } = valid;
      expect(isBadgeIssuedEvent(rest)).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isBadgeIssuedEvent({ ...valid, assertionId: 42 })).toBe(false);
    });
  });

  describe('isBadgeRevokedEvent', () => {
    const valid = {
      assertionId: 'a-001',
      tenantId: 't-001',
      reason: 'Fraudulent activity',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid badge revoked event', () => {
      expect(isBadgeRevokedEvent(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isBadgeRevokedEvent(null)).toBe(false);
    });

    it('returns false when reason missing', () => {
      const { reason: _, ...rest } = valid;
      expect(isBadgeRevokedEvent(rest)).toBe(false);
    });

    it('returns false when assertionId missing', () => {
      const { assertionId: _, ...rest } = valid;
      expect(isBadgeRevokedEvent(rest)).toBe(false);
    });

    it('returns false for non-string reason', () => {
      expect(isBadgeRevokedEvent({ ...valid, reason: 42 })).toBe(false);
    });
  });
});
