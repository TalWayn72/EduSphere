import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * Unit tests for UserStatsService.
 *
 * Covers:
 *  1. getMyStats() aggregates enrolled, annotations, progress, activity correctly.
 *  2. getMyStats() returns zeroed stats when all sub-queries return empty results.
 *  3. computeStreaks (via getMyStats) computes currentStreak for consecutive days.
 *  4. computeStreaks computes longestStreak across a gap.
 *  5. computeStreaks returns 0/0 when no active days.
 *  6. onModuleDestroy() calls closeAllPools().
 *  7. getMyStats() converts total_seconds to minutes correctly.
 *  8. getMyStats() maps weeklyActivity date/count rows properly.
 */

import { UserStatsService } from './user-stats.service';

// ── DB mocks ─────────────────────────────────────────────────────────────────

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

// withTenantContext just calls the callback with the db directly in tests
const mockWithTenantContext = vi.fn(
  (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn(_db)
);

const mockSelectBuilder = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  // Default: empty result
  then: undefined as unknown,
};

// We need fine-grained control over execute() since the service uses it for raw SQL
const mockExecute = vi.fn();

const mockDb = {
  select: vi.fn().mockReturnValue(mockSelectBuilder),
  execute: mockExecute,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: (...args: unknown[]) =>
    mockWithTenantContext(
      ...(args as Parameters<typeof mockWithTenantContext>)
    ),
  schema: {
    annotations: { user_id: 'user_id', tenant_id: 'tenant_id' },
  },
  sql: vi.fn((strings: TemplateStringsArray, ...vals: unknown[]) => ({
    strings,
    vals,
  })),
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...conds: unknown[]) => ({ conds, op: 'and' })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe('UserStatsService', () => {
  let service: UserStatsService;

  /** Sets up what mockExecute resolves with for the three raw-SQL calls. */
  function setupExecuteMocks(
    enrolledCount: number,
    completedCount: number,
    totalSeconds: number,
    activityRows: { date: string; count: number }[]
  ) {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ count: enrolledCount }] }) // countEnrolled
      .mockResolvedValueOnce({
        // sumLearningMinutes
        rows: [{ completed: completedCount, total_seconds: totalSeconds }],
      })
      .mockResolvedValueOnce({ rows: activityRows }); // fetchWeeklyActivity
  }

  /** Sets up what the select chain resolves with for countAnnotations. */
  function setupAnnotationsMock(count: number) {
    mockSelectBuilder.from = vi.fn().mockReturnThis();
    mockSelectBuilder.where = vi
      .fn()
      .mockResolvedValue([{ count: String(count) }]);
    mockDb.select = vi.fn().mockReturnValue(mockSelectBuilder);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserStatsService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('should aggregate all stats correctly from sub-queries', async () => {
    setupAnnotationsMock(7);
    setupExecuteMocks(3, 12, 7200, [
      { date: isoDate(2), count: 4 },
      { date: isoDate(1), count: 2 },
      { date: isoDate(0), count: 5 },
    ]);

    const stats = await service.getMyStats('user-1', 'tenant-1');

    expect(stats.coursesEnrolled).toBe(3);
    expect(stats.annotationsCreated).toBe(7);
    expect(stats.conceptsMastered).toBe(12);
    expect(stats.totalLearningMinutes).toBe(120); // 7200 s / 60
    expect(stats.weeklyActivity).toHaveLength(3);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('should return zeroed stats when all sub-queries return empty', async () => {
    setupAnnotationsMock(0);
    setupExecuteMocks(0, 0, 0, []);

    const stats = await service.getMyStats('user-2', 'tenant-1');

    expect(stats.coursesEnrolled).toBe(0);
    expect(stats.annotationsCreated).toBe(0);
    expect(stats.conceptsMastered).toBe(0);
    expect(stats.totalLearningMinutes).toBe(0);
    expect(stats.weeklyActivity).toHaveLength(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('should compute currentStreak as consecutive days back from today', async () => {
    setupAnnotationsMock(0);
    // Activity on today, yesterday, 2 days ago → streak = 3
    setupExecuteMocks(0, 0, 0, [
      { date: isoDate(2), count: 1 },
      { date: isoDate(1), count: 1 },
      { date: isoDate(0), count: 1 },
    ]);

    const stats = await service.getMyStats('user-3', 'tenant-1');

    expect(stats.currentStreak).toBe(3);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('should compute longestStreak across a gap in activity', async () => {
    setupAnnotationsMock(0);
    // Days: -10, -9, -8 (run=3), gap, -3, -2, -1, today (run=4) → longestStreak=4
    setupExecuteMocks(0, 0, 0, [
      { date: isoDate(10), count: 2 },
      { date: isoDate(9), count: 1 },
      { date: isoDate(8), count: 3 },
      { date: isoDate(3), count: 1 },
      { date: isoDate(2), count: 2 },
      { date: isoDate(1), count: 1 },
      { date: isoDate(0), count: 4 },
    ]);

    const stats = await service.getMyStats('user-4', 'tenant-1');

    expect(stats.longestStreak).toBe(4);
    expect(stats.currentStreak).toBe(4);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('should return streak 0/0 when all activity has count=0', async () => {
    setupAnnotationsMock(0);
    setupExecuteMocks(0, 0, 0, [
      { date: isoDate(1), count: 0 },
      { date: isoDate(0), count: 0 },
    ]);

    const stats = await service.getMyStats('user-5', 'tenant-1');

    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('should call closeAllPools on onModuleDestroy()', async () => {
    await service.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  it('should round totalLearningMinutes correctly from seconds', async () => {
    setupAnnotationsMock(0);
    // 90 seconds → 1.5 minutes → rounds to 2
    setupExecuteMocks(0, 0, 90, []);

    const stats = await service.getMyStats('user-7', 'tenant-1');

    expect(stats.totalLearningMinutes).toBe(2);
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────────
  it('should map weeklyActivity rows with correct date and count types', async () => {
    setupAnnotationsMock(0);
    setupExecuteMocks(0, 0, 0, [
      { date: '2026-02-20', count: 3 },
      { date: '2026-02-21', count: 7 },
    ]);

    const stats = await service.getMyStats('user-8', 'tenant-1');

    expect(stats.weeklyActivity[0]).toEqual({ date: '2026-02-20', count: 3 });
    expect(stats.weeklyActivity[1]).toEqual({ date: '2026-02-21', count: 7 });
  });
});
