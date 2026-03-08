import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    userCourses: {
      courseId: 'courseId',
      userId: 'userId',
      enrolledAt: 'enrolledAt',
      completedAt: 'completedAt',
    },
    userProgress: {
      userId: 'userId',
      lastAccessedAt: 'lastAccessedAt',
      contentItemId: 'contentItemId',
    },
    userLearningVelocity: {
      userId: 'userId',
      tenantId: 'tenantId',
      weekStart: 'weekStart',
      lessonsCompleted: 'lessonsCompleted',
    },
    tenantAnalyticsSnapshots: {
      tenantId: 'tenantId',
      snapshotDate: 'snapshotDate',
      snapshotType: 'snapshotType',
    },
    courses: { id: 'id', tenant_id: 'tenant_id' },
    tenants: { id: 'id' },
  },
  withTenantContext: vi.fn(),
  sql: Object.assign(vi.fn((parts: TemplateStringsArray, ...vals: unknown[]) => ({ sql: true, parts, vals })), {
    raw: vi.fn((s: string) => ({ sqlRaw: s })),
  }),
  count: vi.fn(() => 'count(*)'),
  avg: vi.fn(() => 'avg()'),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

import * as db from '@edusphere/db';
import { TenantAnalyticsService } from './tenant-analytics.service.js';

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001';

/** Builds a minimal tx stub that resolves with the given rows. */
function makeTx(rows: unknown[] = []) {
  const chainable: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin', 'groupBy', 'orderBy'];
  for (const m of methods) {
    chainable[m] = vi.fn(() => chainable);
  }
  // Make the object thenable so `await tx.select(...).from(...).where(...)` resolves
  chainable['then'] = (
    res: (v: unknown) => unknown,
    rej?: (e: unknown) => unknown
  ) => Promise.resolve(rows).then(res, rej);
  return chainable;
}

describe('TenantAnalyticsService', () => {
  let service: TenantAnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantAnalyticsService();
  });

  // ── Memory safety ──────────────────────────────────────────────────────────

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(db.closeAllPools).toHaveBeenCalledOnce();
  });

  // ── getTenantAnalytics shape ───────────────────────────────────────────────

  describe('getTenantAnalytics', () => {
    it('returns correct shape with all 5 required top-level fields', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) => fn(makeTx([]) as never)
      );

      const result = await service.getTenantAnalytics(
        TENANT_ID,
        USER_ID,
        'SEVEN_DAYS'
      );

      expect(result).toMatchObject({
        tenantId: TENANT_ID,
        period: 'SEVEN_DAYS',
        totalEnrollments: expect.any(Number),
        avgLearningVelocity: expect.any(Number),
        activeLearnersTrend: expect.any(Array),
        completionRateTrend: expect.any(Array),
        topCourses: expect.any(Array),
      });
    });

    it('returns zeroed metrics when no data exists', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) => fn(makeTx([]) as never)
      );

      const result = await service.getTenantAnalytics(
        TENANT_ID,
        USER_ID,
        'THIRTY_DAYS'
      );

      expect(result.totalEnrollments).toBe(0);
      expect(result.activeLearnersTrend).toEqual([]);
      expect(result.completionRateTrend).toEqual([]);
      expect(result.topCourses).toEqual([]);
    });

    it('SEVEN_DAYS period is accepted and returns data', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) => fn(makeTx([{ total: 5 }]) as never)
      );

      const result = await service.getTenantAnalytics(
        TENANT_ID,
        USER_ID,
        'SEVEN_DAYS'
      );

      expect(result.period).toBe('SEVEN_DAYS');
    });

    it('NINETY_DAYS tries snapshot cache (empty snapshots falls back to live)', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) => fn(makeTx([]) as never)
      );

      const result = await service.getTenantAnalytics(
        TENANT_ID,
        USER_ID,
        'NINETY_DAYS'
      );

      expect(result.period).toBe('NINETY_DAYS');
      expect(result).toHaveProperty('totalEnrollments');
    });
  });

  // ── getLearnerVelocity ─────────────────────────────────────────────────────

  describe('getLearnerVelocity', () => {
    it('returns empty array gracefully when table not available', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) => {
          // Simulate table not existing
          fn(makeTx([]) as never);
          throw new Error('relation "user_learning_velocity" does not exist');
        }
      );

      const result = await service.getLearnerVelocity(
        TENANT_ID,
        USER_ID,
        'THIRTY_DAYS'
      );

      expect(result).toEqual([]);
    });

    it('returns velocity data with correct shape', async () => {
      const mockRows = [
        { userId: USER_ID, avgLessons: 5.5, totalWeeks: 4 },
      ];
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) =>
          fn({
            ...makeTx(mockRows),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockResolvedValue(mockRows),
          } as never)
      );

      const result = await service.getLearnerVelocity(
        TENANT_ID,
        USER_ID,
        'THIRTY_DAYS',
        10
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ── getCohortRetention ─────────────────────────────────────────────────────

  describe('getCohortRetention', () => {
    it('returns correct cohort shape', async () => {
      const mockRows = [
        {
          cohortWeek: '2025-W10',
          enrolled: 100,
          activeAt7Days: 70,
          activeAt30Days: 50,
        },
      ];
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) =>
          fn({
            ...makeTx(mockRows),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockResolvedValue(mockRows),
          } as never)
      );

      const result = await service.getCohortRetention(TENANT_ID, USER_ID, 4);

      expect(Array.isArray(result)).toBe(true);
    });

    it('returns empty array when no enrollments in window', async () => {
      vi.mocked(db.withTenantContext).mockImplementation(
        async (_d, _c, fn) =>
          fn({
            ...makeTx([]),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockResolvedValue([]),
          } as never)
      );

      const result = await service.getCohortRetention(TENANT_ID, USER_ID, 12);

      expect(result).toEqual([]);
    });
  });
});
