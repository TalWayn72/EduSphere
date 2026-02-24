import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory mock for @edusphere/db ─────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    userCourses: {
      id: 'id', courseId: 'courseId', userId: 'userId',
      enrolledAt: 'enrolledAt', completedAt: 'completedAt',
    },
    contentItems: { id: 'id', moduleId: 'moduleId', title: 'title' },
    modules: { id: 'id', course_id: 'course_id', title: 'title', order_index: 'order_index' },
    userProgress: {
      id: 'id', contentItemId: 'contentItemId',
      userId: 'userId', isCompleted: 'isCompleted', timeSpent: 'timeSpent',
    },
  },
  withTenantContext: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  count: vi.fn(() => 'count(*)'),
  avg: vi.fn(() => 'avg()'),
}));

import * as db from '@edusphere/db';
import { AnalyticsService } from './analytics.service.js';

const CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'INSTRUCTOR' as const };

/** Build a tx whose where() is a thenable (resolves 'resolvedOnWhere') and also exposes groupBy/orderBy */
function makeTx(resolvedOnWhere: unknown[], resolvedOnGroupBy?: unknown[], resolvedOnOrderBy?: unknown[]) {
  let whereCallIdx = 0;
  let groupByCallIdx = 0;
  let orderByCallIdx = 0;
  const whereResult = () => ({
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(resolvedOnWhere[whereCallIdx++] ?? []).then(res, rej),
    catch: (rej: (e: unknown) => unknown) =>
      Promise.resolve(resolvedOnWhere[whereCallIdx] ?? []).catch(rej),
    groupBy: vi.fn(() => Promise.resolve((resolvedOnGroupBy ?? [])[groupByCallIdx++] ?? [])),
    orderBy: vi.fn(() => Promise.resolve((resolvedOnOrderBy ?? [])[orderByCallIdx++] ?? [])),
  });
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(whereResult),
    groupBy: vi.fn(() => Promise.resolve((resolvedOnGroupBy ?? [])[groupByCallIdx++] ?? [])),
    orderBy: vi.fn(() => Promise.resolve((resolvedOnOrderBy ?? [])[orderByCallIdx++] ?? [])),
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService();
  });

  // ── Memory safety ─────────────────────────────────────────────────────────

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(db.closeAllPools).toHaveBeenCalledOnce();
  });

  // ── enrollmentCount ───────────────────────────────────────────────────────

  describe('getEnrollmentCount', () => {
    type Svc = { getEnrollmentCount: (id: string, ctx: typeof CTX) => Promise<number> };

    it('returns correct count from DB', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(async (_d, _c, fn) =>
        fn(makeTx([[{ total: 42 }]]) as never),
      );
      expect(await (service as unknown as Svc).getEnrollmentCount('course-1', CTX)).toBe(42);
    });

    it('returns 0 when no enrollments', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(async (_d, _c, fn) =>
        fn(makeTx([[{ total: 0 }]]) as never),
      );
      expect(await (service as unknown as Svc).getEnrollmentCount('course-1', CTX)).toBe(0);
    });
  });

  // ── completionRate ────────────────────────────────────────────────────────

  describe('getCompletionRate', () => {
    type Svc = { getCompletionRate: (id: string, ctx: typeof CTX) => Promise<number> };

    it('returns 0 when enrollment count is 0 — division by zero guard', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(async (_d, _c, fn) =>
        fn(makeTx([[{ total: 0 }], [{ completed: 0 }]]) as never),
      );
      expect(await (service as unknown as Svc).getCompletionRate('course-1', CTX)).toBe(0);
    });

    it('returns correct percentage (5 of 10 = 50%)', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(async (_d, _c, fn) =>
        fn(makeTx([[{ total: 10 }], [{ completed: 5 }]]) as never),
      );
      expect(await (service as unknown as Svc).getCompletionRate('course-1', CTX)).toBe(50);
    });
  });

  // ── activeLearners ────────────────────────────────────────────────────────

  describe('getActiveLearners', () => {
    type Svc = { getActiveLearners: (id: string, ctx: typeof CTX) => Promise<number> };

    it('returns active count correctly', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(async (_d, _c, fn) =>
        fn(makeTx([[{ total: 7 }]]) as never),
      );
      expect(await (service as unknown as Svc).getActiveLearners('course-1', CTX)).toBe(7);
    });
  });

  // ── getCourseAnalytics ────────────────────────────────────────────────────

  describe('getCourseAnalytics', () => {
    function setupEmptyMock() {
      vi.mocked(db.withTenantContext).mockImplementation(async (_d, _c, fn) =>
        fn(makeTx([[{ total: 0 }], [{ completed: 0 }]], [[]], [[]]) as never),
      );
    }

    it('includes courseId in the response', async () => {
      setupEmptyMock();
      const result = await service.getCourseAnalytics('course-abc', CTX);
      expect(result.courseId).toBe('course-abc');
    });

    it('sets avgQuizScore to null (not yet tracked)', async () => {
      setupEmptyMock();
      const result = await service.getCourseAnalytics('course-abc', CTX);
      expect(result.avgQuizScore).toBeNull();
    });

    it('returns empty arrays when no data', async () => {
      setupEmptyMock();
      const result = await service.getCourseAnalytics('course-empty', CTX);
      expect(result.contentItemMetrics).toEqual([]);
      expect(result.dropOffFunnel).toEqual([]);
    });
  });
});
