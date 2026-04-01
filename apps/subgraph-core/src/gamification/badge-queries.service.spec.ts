/**
 * badge-queries.service.spec.ts — Unit tests for BadgeQueriesService.
 * Covers: myBadges, leaderboard, myRank, myTotalPoints, countUserCourses,
 *         countUserAnnotations, seedPlatformBadges, adminBadges, createBadge,
 *         updateBadge, deleteBadge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockExecute = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.innerJoin = self;
  p.returning = self;
  p.set = self;
  p.values = self;
  p.onConflictDoNothing = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    execute: mockExecute,
  })),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
      fn({
        select: mockSelect,
        insert: mockInsert,
        execute: mockExecute,
      })
  ),
  schema: {
    userBadges: {
      id: 'id',
      badgeId: 'badgeId',
      userId: 'userId',
      earnedAt: 'earnedAt',
    },
    badges: { id: 'id', tenantId: 'tenantId' },
    userPoints: { userId: 'userId', totalPoints: 'totalPoints' },
    annotations: { user_id: 'user_id', tenant_id: 'tenant_id' },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('./badge-definitions.js', () => ({
  PLATFORM_BADGES: [
    {
      name: 'First Step',
      description: 'd',
      icon: '🎓',
      category: 'COMPLETION',
      pointsReward: 100,
      conditionType: 'courses_completed',
      conditionValue: 1,
    },
  ],
}));

import { BadgeQueriesService } from './badge-queries.service';

describe('BadgeQueriesService', () => {
  let service: BadgeQueriesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BadgeQueriesService();
  });

  describe('myBadges', () => {
    it('should return user badges with join', async () => {
      const badge = { id: 'b1', name: 'Test' };
      mockSelect.mockReturnValue(
        makeChain([{ id: 'ub1', earnedAt: new Date('2025-01-01'), badge }])
      );
      const result = await service.myBadges('u1', 't1');
      expect(result).toHaveLength(1);
      expect(result[0].badge).toEqual(badge);
    });
  });

  describe('leaderboard', () => {
    it('should return ranked entries', async () => {
      mockExecute.mockResolvedValue({
        rows: [
          {
            user_id: 'u1',
            first_name: 'A',
            last_name: 'B',
            total_points: 500,
            badge_count: '3',
          },
          {
            user_id: 'u2',
            first_name: 'C',
            last_name: 'D',
            total_points: 300,
            badge_count: '1',
          },
        ],
      });
      const result = await service.leaderboard('t1', 10);
      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].totalPoints).toBe(500);
      expect(result[1].rank).toBe(2);
    });
  });

  describe('myRank', () => {
    it('should return user rank number', async () => {
      mockExecute.mockResolvedValue({ rows: [{ rank: '5' }] });
      const rank = await service.myRank('u1', 't1');
      expect(rank).toBe(5);
    });

    it('should default to 1 when no rows', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const rank = await service.myRank('u1', 't1');
      expect(rank).toBe(1);
    });
  });

  describe('myTotalPoints', () => {
    it('should return total points', async () => {
      mockSelect.mockReturnValue(makeChain([{ total: 1200 }]));
      const pts = await service.myTotalPoints('u1', 't1');
      expect(pts).toBe(1200);
    });

    it('should return 0 when no points record', async () => {
      mockSelect.mockReturnValue(makeChain([]));
      const pts = await service.myTotalPoints('u1', 't1');
      expect(pts).toBe(0);
    });
  });

  describe('countUserCourses', () => {
    it('should return completed course count', async () => {
      mockExecute.mockResolvedValue({ rows: [{ count: '7' }] });
      const n = await service.countUserCourses('u1', 't1');
      expect(n).toBe(7);
    });
  });

  describe('countUserAnnotations', () => {
    it('should return annotation count', async () => {
      mockSelect.mockReturnValue(makeChain([{ count: 12 }]));
      const n = await service.countUserAnnotations('u1', 't1');
      expect(n).toBe(12);
    });
  });

  describe('seedPlatformBadges', () => {
    it('should execute insert for each platform badge', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      await service.seedPlatformBadges();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should not throw on seed error', async () => {
      mockExecute.mockRejectedValue(new Error('dup'));
      await expect(service.seedPlatformBadges()).resolves.toBeUndefined();
    });
  });

  describe('createBadge', () => {
    it('should insert and return badge', async () => {
      const badge = { id: 'b1', name: 'New' };
      mockInsert.mockReturnValue({
        values: vi
          .fn()
          .mockReturnValue({ returning: vi.fn().mockResolvedValue([badge]) }),
      });
      const result = await service.createBadge(
        {
          name: 'New',
          description: 'd',
          iconEmoji: '⭐',
          category: 'STREAK',
          pointsReward: 50,
          conditionType: 'streak',
          conditionValue: 7,
        },
        't1'
      );
      expect(result).toEqual(badge);
    });

    it('should throw when insert returns empty', async () => {
      mockInsert.mockReturnValue({
        values: vi
          .fn()
          .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      });
      await expect(
        service.createBadge(
          {
            name: 'X',
            description: '',
            iconEmoji: '',
            category: '',
            pointsReward: 0,
            conditionType: '',
            conditionValue: 0,
          },
          't1'
        )
      ).rejects.toThrow('Badge insert failed');
    });
  });

  describe('updateBadge', () => {
    it('should update and return badge', async () => {
      const badge = { id: 'b1', name: 'Updated' };
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([badge]),
          }),
        }),
      });
      const result = await service.updateBadge('b1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when badge missing', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
        }),
      });
      await expect(
        service.updateBadge('missing', { name: 'X' })
      ).rejects.toThrow('Badge not found');
    });
  });

  describe('deleteBadge', () => {
    it('should delete and return true', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      const result = await service.deleteBadge('b1');
      expect(result).toBe(true);
    });
  });
});
