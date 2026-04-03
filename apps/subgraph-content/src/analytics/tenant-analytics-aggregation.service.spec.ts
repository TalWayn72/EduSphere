/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantAnalyticsAggregationService } from './tenant-analytics-aggregation.service';

const mockTx = {
  select: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  schema: {
    userCourses: {
      courseId: 'course_id',
      enrolledAt: 'enrolled_at',
      completedAt: 'completed_at',
    },
    userProgress: {
      lastAccessedAt: 'last_accessed_at',
      userId: 'user_id',
    },
    userLearningVelocity: {
      tenantId: 'tenant_id',
      weekStart: 'week_start',
      lessonsCompleted: 'lessons_completed',
    },
  },
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
  sql: vi.fn(),
  and: vi.fn((...c) => ({ and: c })),
}));

vi.mock('drizzle-orm', () => ({
  count: vi.fn(() => 'count_agg'),
  avg: vi.fn(() => 'avg_agg'),
}));

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';
const CUTOFF = new Date('2026-01-01');

function makeSelectChain(rows: unknown[]) {
  const groupBy = vi.fn().mockResolvedValue(rows);
  // Make where() return a thenable+chainable object: some queries use .groupBy(), others await directly
  const whereResult = Object.assign(Promise.resolve(rows), { groupBy });
  const where = vi.fn().mockReturnValue(whereResult);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, groupBy };
}

describe('TenantAnalyticsAggregationService', () => {
  let service: TenantAnalyticsAggregationService;
  const mockDb = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantAnalyticsAggregationService();
  });

  describe('getTotalEnrollments()', () => {
    it('returns total enrollment count', async () => {
      const chain = makeSelectChain([{ total: 42 }]);
      // withTenantContext calls fn(mockTx), mockTx.select returns chain
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getTotalEnrollments(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toBe(42);
    });

    it('returns 0 when no enrollments', async () => {
      const chain = makeSelectChain([{ total: 0 }]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getTotalEnrollments(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toBe(0);
    });

    it('returns 0 for null row', async () => {
      const chain = makeSelectChain([null]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getTotalEnrollments(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toBe(0);
    });
  });

  describe('getActiveLearnersTrend()', () => {
    it('returns daily active learner metrics', async () => {
      const chain = makeSelectChain([
        { date: '2026-01-05', value: 15 },
        { date: '2026-01-06', value: 20 },
      ]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getActiveLearnersTrend(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2026-01-05', value: 15 });
    });

    it('returns empty array when no activity', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getActiveLearnersTrend(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toEqual([]);
    });
  });

  describe('getCompletionRateTrend()', () => {
    it('computes completion rate percentage', async () => {
      const chain = makeSelectChain([
        { date: '2026-01-10', enrollments: 100, completions: 75 },
      ]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getCompletionRateTrend(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result[0]?.value).toBe(75);
    });

    it('returns 0 when no enrollments', async () => {
      const chain = makeSelectChain([
        { date: '2026-01-10', enrollments: 0, completions: 0 },
      ]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getCompletionRateTrend(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result[0]?.value).toBe(0);
    });
  });

  describe('getAvgLearningVelocity()', () => {
    it('returns rounded average velocity', async () => {
      const chain = makeSelectChain([{ avgVelocity: 3.456 }]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getAvgLearningVelocity(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toBe(3.5);
    });

    it('returns 0 when table not available (error)', async () => {
      const { withTenantContext } = await import('@edusphere/db');
      (withTenantContext as any).mockRejectedValueOnce(
        new Error('relation does not exist')
      );

      const result = await service.getAvgLearningVelocity(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toBe(0);
    });
  });

  describe('getTopCourses()', () => {
    it('returns top courses sorted by enrollment count', async () => {
      const chain = makeSelectChain([
        { courseId: 'c1', enrollmentCount: 50, completions: 30 },
        { courseId: 'c2', enrollmentCount: 100, completions: 80 },
      ]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getTopCourses(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      // Sorted by enrollmentCount desc
      expect(result[0]?.courseId).toBe('c2');
      expect(result[0]?.enrollmentCount).toBe(100);
      expect(result[0]?.completionRate).toBe(80);
    });

    it('returns empty array when no enrollments', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getTopCourses(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toEqual([]);
    });

    it('limits results to 10 courses', async () => {
      const rows = Array.from({ length: 15 }, (_, i) => ({
        courseId: `c${i}`,
        enrollmentCount: 15 - i,
        completions: 10 - i,
      }));
      const chain = makeSelectChain(rows);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getTopCourses(
        mockDb,
        TENANT_ID,
        USER_ID,
        CUTOFF
      );
      expect(result).toHaveLength(10);
    });
  });
});
