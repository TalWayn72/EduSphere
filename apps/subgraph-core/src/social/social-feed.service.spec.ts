import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTx } = vi.hoisted(() => {
  const mockTx = {
    select: vi.fn(),
    insert: vi.fn(),
  };
  return { mockTx };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    userFollows: { id: 'id', followerId: 'follower_id', followingId: 'following_id' },
    socialFeedItems: {
      id: 'id', tenantId: 'tenant_id', actorId: 'actor_id',
      verb: 'verb', objectType: 'object_type', objectId: 'object_id',
      objectTitle: 'object_title', createdAt: 'created_at',
    },
    users: { id: 'id', tenant_id: 'tenant_id', display_name: 'display_name' },
  },
  withTenantContext: vi.fn(
    async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) => fn(mockTx)
  ),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
  desc: vi.fn((a: unknown) => ({ desc: a })),
  inArray: vi.fn((a: unknown, b: unknown) => ({ inArray: [a, b] })),
  ilike: vi.fn((a: unknown, b: unknown) => ({ ilike: [a, b] })),
  sql: Object.assign(
    vi.fn((_a: unknown) => ({
      sql: _a,
      as: vi.fn().mockReturnThis(),
    })),
    { raw: vi.fn((a: unknown) => ({ sqlRaw: a })) }
  ),
}));

import { SocialFeedService } from './social-feed.service';
import { SocialFollowService } from './social-follow.service';

describe('SocialFeedService', () => {
  let service: SocialFeedService;
  let followService: SocialFollowService;

  beforeEach(() => {
    vi.clearAllMocks();
    followService = new SocialFollowService();
    service = new SocialFeedService(followService);
  });

  describe('getSocialFeed', () => {
    it('returns empty array when user follows nobody', async () => {
      vi.spyOn(followService, 'getFollowing').mockResolvedValue([]);
      const result = await service.getSocialFeed('u1', 'tenant-1', 20);
      expect(result).toEqual([]);
    });

    it('queries feed items from followed users', async () => {
      vi.spyOn(followService, 'getFollowing').mockResolvedValue(['u2', 'u3']);
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { id: 'feed-1', actorId: 'u2', verb: 'COMPLETED' },
              ]),
            }),
          }),
        }),
      });
      const result = await service.getSocialFeed('u1', 'tenant-1', 20);
      expect(result).toHaveLength(1);
      expect(followService.getFollowing).toHaveBeenCalledWith('u1', 'tenant-1', 100);
    });

    it('uses provided limit parameter', async () => {
      vi.spyOn(followService, 'getFollowing').mockResolvedValue(['u2']);
      const limitFn = vi.fn().mockResolvedValue([]);
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: limitFn,
            }),
          }),
        }),
      });
      await service.getSocialFeed('u1', 'tenant-1', 5);
      expect(limitFn).toHaveBeenCalledWith(5);
    });
  });

  describe('getSocialRecommendations', () => {
    it('returns empty array when user follows nobody', async () => {
      vi.spyOn(followService, 'getFollowing').mockResolvedValue([]);
      const result = await service.getSocialRecommendations('u1', 't1');
      expect(result).toEqual([]);
    });

    it('returns recommendations with followersCount mapped to number', async () => {
      vi.spyOn(followService, 'getFollowing').mockResolvedValue(['u2']);
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    contentItemId: 'course-1',
                    contentTitle: 'Math 101',
                    followersCount: '3',
                    lastActivity: new Date('2026-01-01'),
                  },
                ]),
              }),
            }),
          }),
        }),
      });
      const result = await service.getSocialRecommendations('u1', 't1', 10);
      expect(result).toHaveLength(1);
      expect(result[0].followersCount).toBe(3);
      expect(result[0].isMutualFollower).toBe(false);
    });
  });

  describe('registerFeedSubscriptions', () => {
    it('subscribes to course.completed and pushes to feedSubs array', async () => {
      // Create a subscription that never yields (blocks forever until break)
      const mockSub = {
        [Symbol.asyncIterator]() {
          return {
            next: () => new Promise<IteratorResult<unknown>>(() => {
              // Never resolves — simulates a long-running subscription
            }),
          };
        },
      };
      const mockNats = {
        subscribe: vi.fn().mockReturnValue(mockSub),
      } as any;
      const feedSubs: any[] = [];
      await service.registerFeedSubscriptions(mockNats, feedSubs);
      expect(mockNats.subscribe).toHaveBeenCalledWith(
        'EDUSPHERE.course.completed',
        { queue: 'social-feed-fan-out' }
      );
      expect(feedSubs).toHaveLength(1);
    });
  });
});
