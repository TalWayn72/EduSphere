/**
 * BadgeAutoAwardService — Unit tests for criteria matching logic (F-12).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  withTenantContext: vi.fn((_db, _ctx, fn) =>
    fn({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      execute: vi.fn().mockResolvedValue({ rows: [{ cnt: '0' }] }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    })
  ),
  schema: {
    orgBadges: {
      tenantId: 'tenant_id',
      isActive: 'is_active',
      autoAwardCriteria: 'auto_award_criteria',
    },
    userBadges: { id: 'id' },
    pointEvents: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockRejectedValue(new Error('NATS unavailable')),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

describe('BadgeAutoAwardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criteria matching logic', () => {
    // Test the matchesCriteria method indirectly via the service
    // Since it's private, we test through the class pattern

    it('should match COURSE_COMPLETE criteria', async () => {
      const { BadgeAutoAwardService } =
        await import('./badge-auto-award.service');
      const service = new BadgeAutoAwardService();

      // Access private method for testing
      const matchesCriteria = (
        service as unknown as {
          matchesCriteria: (
            criteria: { type: string; courseId?: string },
            payload: { courseId?: string },
            subject: string
          ) => boolean;
        }
      ).matchesCriteria.bind(service);

      expect(
        matchesCriteria(
          { type: 'COURSE_COMPLETE' },
          { courseId: 'course-1' },
          'EDUSPHERE.course.completed'
        )
      ).toBe(true);

      // Specific courseId match
      expect(
        matchesCriteria(
          { type: 'COURSE_COMPLETE', courseId: 'course-1' },
          { courseId: 'course-1' },
          'EDUSPHERE.course.completed'
        )
      ).toBe(true);

      // Specific courseId mismatch
      expect(
        matchesCriteria(
          { type: 'COURSE_COMPLETE', courseId: 'course-1' },
          { courseId: 'course-2' },
          'EDUSPHERE.course.completed'
        )
      ).toBe(false);

      // Wrong subject
      expect(
        matchesCriteria({ type: 'COURSE_COMPLETE' }, {}, 'EDUSPHERE.xp.earned')
      ).toBe(false);
    });

    it('should match XP_THRESHOLD criteria', async () => {
      const { BadgeAutoAwardService } =
        await import('./badge-auto-award.service');
      const service = new BadgeAutoAwardService();

      const matchesCriteria = (
        service as unknown as {
          matchesCriteria: (
            criteria: { type: string; amount?: number },
            payload: { xpAmount?: number },
            subject: string
          ) => boolean;
        }
      ).matchesCriteria.bind(service);

      expect(
        matchesCriteria(
          { type: 'XP_THRESHOLD', amount: 100 },
          { xpAmount: 150 },
          'EDUSPHERE.xp.earned'
        )
      ).toBe(true);

      expect(
        matchesCriteria(
          { type: 'XP_THRESHOLD', amount: 100 },
          { xpAmount: 50 },
          'EDUSPHERE.xp.earned'
        )
      ).toBe(false);
    });

    it('should match STREAK_DAYS criteria', async () => {
      const { BadgeAutoAwardService } =
        await import('./badge-auto-award.service');
      const service = new BadgeAutoAwardService();

      const matchesCriteria = (
        service as unknown as {
          matchesCriteria: (
            criteria: { type: string; count?: number },
            payload: { streakDays?: number },
            subject: string
          ) => boolean;
        }
      ).matchesCriteria.bind(service);

      expect(
        matchesCriteria(
          { type: 'STREAK_DAYS', count: 7 },
          { streakDays: 10 },
          'EDUSPHERE.streak.achieved'
        )
      ).toBe(true);

      expect(
        matchesCriteria(
          { type: 'STREAK_DAYS', count: 7 },
          { streakDays: 5 },
          'EDUSPHERE.streak.achieved'
        )
      ).toBe(false);
    });

    it('should match QUIZ_SCORE criteria', async () => {
      const { BadgeAutoAwardService } =
        await import('./badge-auto-award.service');
      const service = new BadgeAutoAwardService();

      const matchesCriteria = (
        service as unknown as {
          matchesCriteria: (
            criteria: { type: string; minScore?: number },
            payload: { quizScore?: number },
            subject: string
          ) => boolean;
        }
      ).matchesCriteria.bind(service);

      expect(
        matchesCriteria(
          { type: 'QUIZ_SCORE', minScore: 80 },
          { quizScore: 90 },
          'EDUSPHERE.quiz.completed'
        )
      ).toBe(true);

      expect(
        matchesCriteria(
          { type: 'QUIZ_SCORE', minScore: 80 },
          { quizScore: 70 },
          'EDUSPHERE.quiz.completed'
        )
      ).toBe(false);
    });

    it('should return false for unknown criteria type', async () => {
      const { BadgeAutoAwardService } =
        await import('./badge-auto-award.service');
      const service = new BadgeAutoAwardService();

      const matchesCriteria = (
        service as unknown as {
          matchesCriteria: (
            criteria: { type: string },
            payload: Record<string, unknown>,
            subject: string
          ) => boolean;
        }
      ).matchesCriteria.bind(service);

      expect(
        matchesCriteria(
          { type: 'UNKNOWN_TYPE' },
          {},
          'EDUSPHERE.course.completed'
        )
      ).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clean up resources', async () => {
      const { BadgeAutoAwardService } =
        await import('./badge-auto-award.service');
      const service = new BadgeAutoAwardService();
      const { closeAllPools } = await import('@edusphere/db');

      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
