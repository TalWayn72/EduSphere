import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── SocialRecommendationsService mock ───────────────────────────────────────
const mockGetRecommendations = vi.fn();
const mockGetSocialFeed = vi.fn();

vi.mock('./social-recommendations.service', () => ({
  SocialRecommendationsService: class {
    getRecommendations = mockGetRecommendations;
    getSocialFeed = mockGetSocialFeed;
  },
}));

import { SocialRecommendationsResolver } from './social-recommendations.resolver.js';
import { SocialRecommendationsService } from './social-recommendations.service.js';

const makeCtx = (
  overrides: Partial<{ userId: string; tenantId: string }> = {}
) => ({
  authContext: {
    userId: overrides.userId ?? 'user-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
  },
});

describe('SocialRecommendationsResolver', () => {
  let resolver: SocialRecommendationsResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new SocialRecommendationsResolver(
      new SocialRecommendationsService({} as never)
    );
  });

  describe('socialRecommendations()', () => {
    it('calls service with default limit 10 when limit is undefined', async () => {
      mockGetRecommendations.mockResolvedValue([
        {
          courseId: 'c-1',
          courseName: 'React',
          lastActivity: new Date('2024-01-01'),
        },
      ]);

      const result = await resolver.socialRecommendations(undefined, makeCtx());

      expect(mockGetRecommendations).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        10
      );
      expect(result[0]!.lastActivity).toBe('2024-01-01T00:00:00.000Z');
    });

    it('calls service with provided limit', async () => {
      mockGetRecommendations.mockResolvedValue([]);
      await resolver.socialRecommendations(5, makeCtx());
      expect(mockGetRecommendations).toHaveBeenCalledWith(
        'user-1',
        'tenant-1',
        5
      );
    });

    it('converts lastActivity Date to ISO string', async () => {
      const date = new Date('2025-06-15T10:30:00.000Z');
      mockGetRecommendations.mockResolvedValue([
        { courseId: 'c-2', lastActivity: date },
      ]);
      const result = await resolver.socialRecommendations(undefined, makeCtx());
      expect(result[0]!.lastActivity).toBe('2025-06-15T10:30:00.000Z');
    });

    it('throws UnauthorizedException when authContext missing', async () => {
      await expect(
        resolver.socialRecommendations(undefined, {} as never)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when userId missing', async () => {
      const ctx = { authContext: { userId: null, tenantId: 'tenant-1' } };
      await expect(
        resolver.socialRecommendations(undefined, ctx as never)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('socialFeed()', () => {
    it('calls service with default limit 20 when limit is undefined', async () => {
      mockGetSocialFeed.mockResolvedValue([
        {
          type: 'COURSE_COMPLETED',
          userId: 'u1',
          timestamp: new Date('2024-02-01'),
        },
      ]);

      const result = await resolver.socialFeed(undefined, makeCtx());

      expect(mockGetSocialFeed).toHaveBeenCalledWith('user-1', 'tenant-1', 20);
      expect(result[0]!.timestamp).toBe('2024-02-01T00:00:00.000Z');
    });

    it('calls service with provided limit', async () => {
      mockGetSocialFeed.mockResolvedValue([]);
      await resolver.socialFeed(7, makeCtx());
      expect(mockGetSocialFeed).toHaveBeenCalledWith('user-1', 'tenant-1', 7);
    });
  });
});
