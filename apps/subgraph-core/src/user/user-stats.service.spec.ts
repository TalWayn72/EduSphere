import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTx = { select: vi.fn(), execute: vi.fn() };

vi.mock("@edusphere/db", () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    annotations: { user_id: "user_id", tenant_id: "tenant_id" },
  },
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  sql: vi.fn((strings, ...vals) => ({ strings, vals })),
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...conds) => ({ conds })),
}));

import { UserStatsService } from "./user-stats.service.js";

describe("UserStatsService", () => {
  let service: UserStatsService;

  const setupMocks = (opts = {}) => {
    const {
      enrolled = 5,
      annotationCount = 12,
      completed = 8,
      totalSeconds = 7200,
      activityRows = [],
    } = opts;
    let executeCallCount = 0;
    mockTx.execute.mockImplementation(() => {
      const call = executeCallCount++;
      if (call === 0) return Promise.resolve({ rows: [{ count: enrolled }] });
      if (call === 1) return Promise.resolve({ rows: [{ completed, total_seconds: totalSeconds }] });
      return Promise.resolve({ rows: activityRows });
    });
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: String(annotationCount) }]),
      }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    service = new UserStatsService();
  });

  describe("getMyStats()", () => {
    it("returns coursesEnrolled from user_courses table", async () => {
      const stats = await service.getMyStats("user-1", "tenant-1");
      expect(stats.coursesEnrolled).toBe(5);
    });

    it("returns annotationsCreated filtered by userId and tenantId", async () => {
      const stats = await service.getMyStats("user-1", "tenant-1");
      expect(stats.annotationsCreated).toBe(12);
    });

    it("returns conceptsMastered from completed user_progress rows", async () => {
      setupMocks({ completed: 3 });
      const stats = await service.getMyStats("user-1", "tenant-1");
      expect(stats.conceptsMastered).toBe(3);
    });

    it("converts totalSeconds to totalLearningMinutes by dividing by 60", async () => {
      setupMocks({ totalSeconds: 3600 });
      const stats = await service.getMyStats("user-1", "tenant-1");
      expect(stats.totalLearningMinutes).toBe(60);
    });

    it("returns weeklyActivity as array of {date, count} entries", async () => {
      const activityRows = [{ date: "2026-02-17", count: 3 }, { date: "2026-02-18", count: 5 }];
      setupMocks({ activityRows });
      const stats = await service.getMyStats("user-1", "tenant-1");
      expect(stats.weeklyActivity).toHaveLength(2);
      expect(stats.weeklyActivity[0].date).toBe("2026-02-17");
      expect(stats.weeklyActivity[0].count).toBe(3);
    });

    it("returns all zeros when user has no activity", async () => {
      setupMocks({ enrolled: 0, annotationCount: 0, completed: 0, totalSeconds: 0 });
      const stats = await service.getMyStats("user-new", "tenant-1");
      expect(stats.coursesEnrolled).toBe(0);
      expect(stats.annotationsCreated).toBe(0);
      expect(stats.conceptsMastered).toBe(0);
      expect(stats.totalLearningMinutes).toBe(0);
    });

    it("wraps all queries in withTenantContext for tenant isolation", async () => {
      const { withTenantContext } = await import("@edusphere/db");
      await service.getMyStats("user-1", "tenant-1");
      expect(withTenantContext).toHaveBeenCalledTimes(1);
      const [, ctx] = vi.mocked(withTenantContext).mock.calls[0];
      expect(ctx.tenantId).toBe("tenant-1");
      expect(ctx.userId).toBe("user-1");
    });

    it("filters annotations by both userId AND tenantId (prevents cross-tenant reads)", async () => {
      const { and } = await import("@edusphere/db");
      await service.getMyStats("user-1", "tenant-1");
      expect(and).toHaveBeenCalled();
    });
  });

  describe("onModuleDestroy()", () => {
    it("calls closeAllPools to release DB connections", async () => {
      const { closeAllPools } = await import("@edusphere/db");
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalledTimes(1);
    });
  });

  describe('computeStreaks() — streak computation', () => {
    it('returns currentStreak=0 and longestStreak=0 when weeklyActivity is empty', async () => {
      mockTx.execute.mockResolvedValueOnce({ rows: [{ count: 0 }] })
             .mockResolvedValueOnce({ rows: [{ completed: 0, total_seconds: 0 }] })
             .mockResolvedValueOnce({ rows: [] });
      const stats = await service.getMyStats('user-1', 'tenant-1');
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
    });

    it('returns currentStreak=1 when only today has activity', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockTx.execute.mockResolvedValueOnce({ rows: [{ count: 0 }] })
             .mockResolvedValueOnce({ rows: [{ completed: 0, total_seconds: 0 }] })
             .mockResolvedValueOnce({ rows: [{ date: today, count: 3 }] });
      const stats = await service.getMyStats('user-1', 'tenant-1');
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
    });

    it('returns currentStreak=0 when most recent activity was 2+ days ago', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      mockTx.execute.mockResolvedValueOnce({ rows: [{ count: 0 }] })
             .mockResolvedValueOnce({ rows: [{ completed: 0, total_seconds: 0 }] })
             .mockResolvedValueOnce({ rows: [{ date: twoDaysAgo, count: 5 }] });
      const stats = await service.getMyStats('user-1', 'tenant-1');
      expect(stats.currentStreak).toBe(0);
    });

    it('counts consecutive-day streak correctly for 3 consecutive days ending today', async () => {
      const days = [0, 1, 2].map(offset => {
        const d = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
        return { date: d.toISOString().split('T')[0], count: 2 };
      });
      mockTx.execute.mockResolvedValueOnce({ rows: [{ count: 0 }] })
             .mockResolvedValueOnce({ rows: [{ completed: 0, total_seconds: 0 }] })
             .mockResolvedValueOnce({ rows: days });
      const stats = await service.getMyStats('user-1', 'tenant-1');
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3);
    });

    it('skips days with count=0 when computing streaks', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      mockTx.execute.mockResolvedValueOnce({ rows: [{ count: 0 }] })
             .mockResolvedValueOnce({ rows: [{ completed: 0, total_seconds: 0 }] })
             .mockResolvedValueOnce({ rows: [
               { date: yesterday, count: 0 },
               { date: today, count: 3 },
             ]});
      const stats = await service.getMyStats('user-1', 'tenant-1');
      expect(stats.currentStreak).toBe(1);
    });

    it('returns longestStreak from historical data even when current streak is broken', async () => {
      // 3-day streak from 10 days ago, current streak broken
      const makeDay = (offset: number, cnt: number) => ({
        date: new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: cnt,
      });
      mockTx.execute.mockResolvedValueOnce({ rows: [{ count: 0 }] })
             .mockResolvedValueOnce({ rows: [{ completed: 0, total_seconds: 0 }] })
             .mockResolvedValueOnce({ rows: [
               makeDay(10, 5),
               makeDay(11, 3),
               makeDay(12, 7),
             ]});
      const stats = await service.getMyStats('user-1', 'tenant-1');
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(3);
    });

    it('includes currentStreak and longestStreak fields in returned stats object', async () => {
      mockTx.execute.mockResolvedValue({ rows: [] });
      const stats = await service.getMyStats('user-1', 'tenant-1');
      expect(Object.prototype.hasOwnProperty.call(stats, 'currentStreak')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(stats, 'longestStreak')).toBe(true);
    });
  });
});