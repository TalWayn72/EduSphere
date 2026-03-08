import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  sql: vi.fn((strings: TemplateStringsArray) => ({ strings })),
  withTenantContext: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { ChallengesService } from './challenges.service.js';
import { withTenantContext, closeAllPools } from '@edusphere/db';

describe('ChallengesService', () => {
  let service: ChallengesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChallengesService();
  });

  describe('getUserChallenges', () => {
    it('returns empty array when no challenges exist', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce([] as never);
      const result = await service.getUserChallenges('user-1', 'tenant-1');
      expect(result).toEqual([]);
    });

    it('returns challenges with progress data', async () => {
      const challenges = [
        {
          id: 'c1',
          title: 'Complete 3 Lessons',
          description: 'Finish 3 lessons this week',
          targetType: 'LESSON_COUNT' as const,
          targetValue: 3,
          xpReward: 50,
          endDate: '2026-03-15',
          currentValue: 1,
          completed: false,
        },
      ];
      vi.mocked(withTenantContext).mockResolvedValueOnce(challenges as never);
      const result = await service.getUserChallenges('user-1', 'tenant-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('Complete 3 Lessons');
      expect(result[0]!.currentValue).toBe(1);
    });

    it('calls withTenantContext with STUDENT role', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce([] as never);
      await service.getUserChallenges('user-abc', 'tenant-xyz');
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'user-abc', tenantId: 'tenant-xyz', userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });

  describe('incrementProgress', () => {
    it('calls withTenantContext when incrementing', async () => {
      vi.mocked(withTenantContext).mockResolvedValueOnce(undefined as never);
      await service.incrementProgress('user-1', 'tenant-1', 'LESSON_COUNT', 1);
      expect(withTenantContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
