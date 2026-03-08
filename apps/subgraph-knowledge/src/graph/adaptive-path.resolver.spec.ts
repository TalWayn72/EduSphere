import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── AdaptivePathService mock ─────────────────────────────────────────────────
const mockGetAdaptivePath = vi.fn();

vi.mock('./adaptive-path.service', () => ({
  AdaptivePathService: class {
    getAdaptivePath = mockGetAdaptivePath;
  },
}));

import { AdaptivePathResolver } from './adaptive-path.resolver.js';
import { AdaptivePathService } from './adaptive-path.service.js';

const makeCtx = (
  overrides: Partial<{ userId: string; tenantId: string }> = {}
) => ({
  authContext: {
    userId: overrides.userId ?? 'user-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    roles: ['STUDENT'],
  },
});

const mockPath = {
  courseId: 'course-1',
  timeBudgetMinutes: 30,
  items: [
    {
      contentItemId: 'ci-1',
      title: 'Advanced Hooks',
      estimatedMinutes: 25,
      reason: 'Gap topic that fits your time budget',
      priorityScore: 1.2,
    },
  ],
  masteryGapCount: 1,
};

describe('AdaptivePathResolver', () => {
  let resolver: AdaptivePathResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AdaptivePathResolver(new AdaptivePathService());
  });

  describe('adaptiveLearningPath()', () => {
    it('returns adaptive path from service', async () => {
      mockGetAdaptivePath.mockResolvedValue(mockPath);

      const result = await resolver.adaptiveLearningPath(
        'course-1',
        30,
        makeCtx()
      );

      expect(result).toEqual(mockPath);
      expect(mockGetAdaptivePath).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        'course-1',
        30
      );
    });

    it('passes custom timeBudget to service', async () => {
      mockGetAdaptivePath.mockResolvedValue({ ...mockPath, timeBudgetMinutes: 60 });

      await resolver.adaptiveLearningPath('course-2', 60, makeCtx());

      expect(mockGetAdaptivePath).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        'course-2',
        60
      );
    });

    it('throws UnauthorizedException when userId missing', async () => {
      const ctx = {
        authContext: { userId: null, tenantId: 'tenant-1', roles: ['STUDENT'] },
      };
      await expect(
        resolver.adaptiveLearningPath('course-1', 30, ctx as never)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenantId missing', async () => {
      const ctx = {
        authContext: { userId: 'user-1', tenantId: null, roles: ['STUDENT'] },
      };
      await expect(
        resolver.adaptiveLearningPath('course-1', 30, ctx as never)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when authContext missing', async () => {
      await expect(
        resolver.adaptiveLearningPath('course-1', 30, {} as never)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
