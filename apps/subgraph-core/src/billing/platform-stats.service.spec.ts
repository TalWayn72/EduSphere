/**
 * platform-stats.service.spec.ts — Unit tests for PlatformStatsService.
 * Covers: getPlatformStats happy path, error fallback, onModuleDestroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: (...args: unknown[]) => mockSelect(...args),
  })),
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  schema: {
    tenants: {},
    users: { role: 'role' },
    courses: {},
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  count: vi.fn(() => 'COUNT(*)'),
}));

import { PlatformStatsService } from './platform-stats.service';

describe('PlatformStatsService', () => {
  let service: PlatformStatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlatformStatsService();
  });

  describe('getPlatformStats', () => {
    it('should aggregate cross-tenant stats', async () => {
      mockSelect
        .mockReturnValueOnce(makeChain([{ value: 15 }])) // tenants
        .mockReturnValueOnce(makeChain([{ value: 200 }])) // learners
        .mockReturnValueOnce(makeChain([{ value: 50 }])); // courses

      const result = await service.getPlatformStats();
      expect(result.totalTenants).toBe(15);
      expect(result.totalLearners).toBe(200);
      expect(result.totalCoursesCreated).toBe(50);
      expect(result.avgEngagementScore).toBe(0);
    });

    it('should default to zeros when no data', async () => {
      mockSelect.mockReturnValue(makeChain([]));
      const result = await service.getPlatformStats();
      expect(result.totalTenants).toBe(0);
      expect(result.totalLearners).toBe(0);
      expect(result.totalCoursesCreated).toBe(0);
    });

    it('should return zeros on DB error', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('connection refused');
      });

      const result = await service.getPlatformStats();
      expect(result).toEqual({
        totalTenants: 0,
        totalLearners: 0,
        totalCoursesCreated: 0,
        avgEngagementScore: 0,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should close all pools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    });
  });
});
