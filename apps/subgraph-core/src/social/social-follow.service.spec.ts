import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTx } = vi.hoisted(() => {
  const mockTx = {
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  };
  return { mockTx };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    userFollows: {
      id: 'id',
      followerId: 'follower_id',
      followingId: 'following_id',
      tenantId: 'tenant_id',
    },
    users: {
      id: 'id',
      tenant_id: 'tenant_id',
      display_name: 'display_name',
    },
  },
  withTenantContext: vi.fn(
    async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) => fn(mockTx)
  ),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
  ilike: vi.fn((a: unknown, b: unknown) => ({ ilike: [a, b] })),
}));

import { SocialFollowService } from './social-follow.service';

describe('SocialFollowService', () => {
  let service: SocialFollowService;

  const setupSelect = (rows: unknown[]) => {
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
        }),
      }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SocialFollowService();
  });

  describe('followUser', () => {
    it('inserts a follow record and returns true', async () => {
      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      });
      const result = await service.followUser('u1', 'u2', 'tenant-1');
      expect(result).toBe(true);
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('throws BadRequestException when following yourself', async () => {
      await expect(service.followUser('u1', 'u1', 'tenant-1')).rejects.toThrow(
        'Cannot follow yourself'
      );
    });

    it('uses onConflictDoNothing for idempotency', async () => {
      const onConflict = vi.fn().mockResolvedValue(undefined);
      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: onConflict,
        }),
      });
      await service.followUser('u1', 'u2', 't1');
      expect(onConflict).toHaveBeenCalled();
    });
  });

  describe('unfollowUser', () => {
    it('returns true when a row was deleted', async () => {
      mockTx.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'row-1' }]),
        }),
      });
      const result = await service.unfollowUser('u1', 'u2', 't1');
      expect(result).toBe(true);
    });

    it('returns false when no row was deleted', async () => {
      mockTx.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });
      const result = await service.unfollowUser('u1', 'u2', 't1');
      expect(result).toBe(false);
    });
  });

  describe('getFollowers', () => {
    it('returns follower IDs for a user', async () => {
      setupSelect([{ followerId: 'a' }, { followerId: 'b' }]);
      const result = await service.getFollowers('target', 'tenant-1');
      expect(result).toEqual(['a', 'b']);
    });

    it('returns empty array when no followers', async () => {
      setupSelect([]);
      const result = await service.getFollowers('lonely', 'tenant-1');
      expect(result).toEqual([]);
    });
  });

  describe('getFollowing', () => {
    it('returns following IDs for a user', async () => {
      setupSelect([{ followingId: 'x' }, { followingId: 'y' }]);
      const result = await service.getFollowing('user-1', 'tenant-1');
      expect(result).toEqual(['x', 'y']);
    });
  });

  describe('isFollowing', () => {
    it('returns true when a follow record exists', async () => {
      setupSelect([{ id: 'row-1' }]);
      expect(await service.isFollowing('u1', 'u2', 't1')).toBe(true);
    });

    it('returns false when no follow record exists', async () => {
      setupSelect([]);
      expect(await service.isFollowing('u1', 'u2', 't1')).toBe(false);
    });
  });

  describe('getFollowersCount', () => {
    it('returns the count of followers', async () => {
      setupSelect([
        { followerId: 'a' },
        { followerId: 'b' },
        { followerId: 'c' },
      ]);
      const count = await service.getFollowersCount('user-1', 'tenant-1');
      expect(count).toBe(3);
    });
  });

  describe('getFollowingCount', () => {
    it('returns the count of following', async () => {
      setupSelect([{ followingId: 'a' }]);
      const count = await service.getFollowingCount('user-1', 'tenant-1');
      expect(count).toBe(1);
    });
  });

  describe('getMutualFollowers', () => {
    it('returns intersection of two users follower sets', async () => {
      let callCount = 0;
      mockTx.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(async () => {
              callCount++;
              return callCount === 1
                ? [
                    { followerId: 'a' },
                    { followerId: 'b' },
                    { followerId: 'c' },
                  ]
                : [
                    { followerId: 'b' },
                    { followerId: 'c' },
                    { followerId: 'd' },
                  ];
            }),
          }),
        }),
      }));
      const mutual = await service.getMutualFollowers('u1', 'u2', 't1');
      expect(mutual).toContain('b');
      expect(mutual).toContain('c');
      expect(mutual).not.toContain('a');
      expect(mutual).not.toContain('d');
    });
  });

  describe('searchUsers', () => {
    it('returns empty array for queries shorter than 3 chars', async () => {
      const result = await service.searchUsers('ab', 'tenant-1');
      expect(result).toEqual([]);
      expect(mockTx.select).not.toHaveBeenCalled();
    });

    it('returns matched users for valid query', async () => {
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([{ id: 'u1', display_name: 'Alice Smith' }]),
          }),
        }),
      });
      const result = await service.searchUsers('Alice', 'tenant-1');
      expect(result).toEqual([{ id: 'u1', displayName: 'Alice Smith' }]);
    });
  });
});
