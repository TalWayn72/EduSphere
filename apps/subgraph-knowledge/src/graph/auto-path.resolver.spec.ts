import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── AutoPathService mock ─────────────────────────────────────────────────────
const mockGetMyLearningPath = vi.fn();

vi.mock('./auto-path.service', () => ({
  AutoPathService: class {
    getMyLearningPath = mockGetMyLearningPath;
  },
}));

import { AutoPathResolver } from './auto-path.resolver.js';
import { AutoPathService } from './auto-path.service.js';

const makeCtx = (
  overrides: Partial<{ userId: string; tenantId: string; roles: string[] }> = {}
) => ({
  authContext: {
    userId: overrides.userId ?? 'user-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    roles: overrides.roles ?? ['STUDENT'],
  },
});

describe('AutoPathResolver', () => {
  let resolver: AutoPathResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AutoPathResolver(new AutoPathService({} as never));
  });

  describe('myLearningPath()', () => {
    it('returns learning path from service', async () => {
      const path = {
        targetConceptName: 'Calculus',
        nodes: [
          { conceptName: 'Algebra', isCompleted: true, contentItems: [] },
        ],
        totalSteps: 1,
        completedSteps: 1,
      };
      mockGetMyLearningPath.mockResolvedValue(path);

      const result = await resolver.myLearningPath('Calculus', makeCtx());
      expect(result).toEqual(path);
      expect(mockGetMyLearningPath).toHaveBeenCalledWith(
        'Calculus',
        'user-1',
        'tenant-1',
        'STUDENT'
      );
    });

    it('returns null when service returns null', async () => {
      mockGetMyLearningPath.mockResolvedValue(null);
      const result = await resolver.myLearningPath('Unknown', makeCtx());
      expect(result).toBeNull();
    });

    it('throws UnauthorizedException when userId missing', async () => {
      const ctx = {
        authContext: { userId: null, tenantId: 'tenant-1', roles: ['STUDENT'] },
      };
      await expect(resolver.myLearningPath('X', ctx as never)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws UnauthorizedException when tenantId missing', async () => {
      const ctx = {
        authContext: { userId: 'user-1', tenantId: null, roles: ['STUDENT'] },
      };
      await expect(resolver.myLearningPath('X', ctx as never)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws UnauthorizedException when authContext missing', async () => {
      await expect(resolver.myLearningPath('X', {} as never)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
