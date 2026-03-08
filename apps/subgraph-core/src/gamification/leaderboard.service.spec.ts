import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  sql: vi.fn((strings: TemplateStringsArray) => ({ strings })),
  withTenantContext: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { LeaderboardService } from './leaderboard.service.js';
import { withTenantContext, closeAllPools } from '@edusphere/db';

const MOCK_ROWS = [
  { user_id: 'u1', display_name: 'Alice', total_xp: 500, level: 3 },
  { user_id: 'u2', display_name: 'Bob', total_xp: 300, level: 2 },
];

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new LeaderboardService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('getLeaderboard', () => {
    it('returns ranked leaderboard entries', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce([
        { rank: 1, userId: 'u1', displayName: 'Alice', totalXp: 500, level: 3 },
        { rank: 2, userId: 'u2', displayName: 'Bob', totalXp: 300, level: 2 },
      ] as never);
      const result = await service.getLeaderboard('tenant-1', 10);
      expect(result).toHaveLength(2);
      expect(result[0]!.rank).toBe(1);
      expect(result[0]!.displayName).toBe('Alice');
      expect(result[1]!.rank).toBe(2);
    });

    it('uses cache on second call within TTL', async () => {
      const entries = [
        { rank: 1, userId: 'u1', displayName: 'Alice', totalXp: 500, level: 3 },
      ];
      vi.mocked(withTenantContext).mockResolvedValueOnce(entries as never);
      await service.getLeaderboard('tenant-1', 10);
      await service.getLeaderboard('tenant-1', 10);
      // withTenantContext called only once (second hit from cache)
      expect(withTenantContext).toHaveBeenCalledTimes(1);
    });

    it('fetches again after cache TTL expires', async () => {
      const entries = [
        { rank: 1, userId: 'u1', displayName: 'Alice', totalXp: 500, level: 3 },
      ];
      vi.mocked(withTenantContext).mockResolvedValue(entries as never);
      await service.getLeaderboard('tenant-1', 10);
      // Advance time past 1-hour TTL
      vi.advanceTimersByTime(61 * 60 * 1000);
      await service.getLeaderboard('tenant-1', 10);
      expect(withTenantContext).toHaveBeenCalledTimes(2);
    });

    it('uses separate cache keys for different limits', async () => {
      const entries = [
        { rank: 1, userId: 'u1', displayName: 'Alice', totalXp: 500, level: 3 },
      ];
      vi.mocked(withTenantContext).mockResolvedValue(entries as never);
      await service.getLeaderboard('tenant-1', 5);
      await service.getLeaderboard('tenant-1', 10);
      expect(withTenantContext).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateCache', () => {
    it('clears cache entries for the given tenant', async () => {
      const entries = [
        { rank: 1, userId: 'u1', displayName: 'Alice', totalXp: 500, level: 3 },
      ];
      vi.mocked(withTenantContext).mockResolvedValue(entries as never);
      await service.getLeaderboard('tenant-1', 10);
      service.invalidateCache('tenant-1');
      // After invalidation, next call should re-fetch
      await service.getLeaderboard('tenant-1', 10);
      expect(withTenantContext).toHaveBeenCalledTimes(2);
    });
  });

  describe('onModuleDestroy', () => {
    it('clears cleanup interval', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      await service.onModuleDestroy();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
