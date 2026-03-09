import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTx, mockNatsConn } = vi.hoisted(() => {
  const deleteMock = vi.fn();
  const insertMock = vi.fn();
  const selectMock = vi.fn();
  const mockTx = {
    delete: deleteMock,
    insert: insertMock,
    select: selectMock,
  };
  const mockNatsConn = {
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  };
  return { mockTx, mockNatsConn };
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
    socialFeedItems: {
      id: 'id',
      tenantId: 'tenant_id',
      actorId: 'actor_id',
      verb: 'verb',
      objectType: 'object_type',
      objectId: 'object_id',
      objectTitle: 'object_title',
      createdAt: 'created_at',
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
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
  desc: vi.fn((a: unknown) => ({ desc: a })),
  inArray: vi.fn((a: unknown, b: unknown) => ({ inArray: [a, b] })),
  ilike: vi.fn((a: unknown, b: unknown) => ({ ilike: [a, b] })),
  sql: Object.assign(vi.fn((a: unknown) => ({ sql: a })), { raw: vi.fn((a: unknown) => ({ sqlRaw: a })) }),
}));

vi.mock('nats', () => ({ connect: vi.fn().mockResolvedValue(mockNatsConn) }));
vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

import { SocialService } from './social.service';

describe('SocialService', () => {
  let service: SocialService;

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
    service = new SocialService();
  });

  // Test 1: followUser inserts record and returns true
  it('followUser inserts record and returns true', async () => {
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });
    setupSelect([]);

    const result = await service.followUser(
      'follower1',
      'following1',
      'tenant1'
    );
    expect(result).toBe(true);
    expect(mockTx.insert).toHaveBeenCalled();
  });

  // Test 2: followUser is idempotent (second call returns true, no duplicate)
  it('followUser is idempotent — onConflictDoNothing prevents duplicates', async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing }),
    });
    setupSelect([]);

    await service.followUser('f1', 'f2', 't1');
    await service.followUser('f1', 'f2', 't1');

    expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
  });

  // Test 3: unfollowUser removes record and returns true
  it('unfollowUser removes record and returns true when row existed', async () => {
    mockTx.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'row1' }]),
      }),
    });

    const result = await service.unfollowUser('f1', 'f2', 't1');
    expect(result).toBe(true);
    expect(mockTx.delete).toHaveBeenCalled();
  });

  // Test 4: unfollowUser on non-existing follow returns false
  it('unfollowUser returns false when follow record does not exist', async () => {
    mockTx.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.unfollowUser('f1', 'f2', 't1');
    expect(result).toBe(false);
  });

  // Test 5: getFollowers returns correct user IDs
  it('getFollowers returns follower IDs for given user', async () => {
    setupSelect([{ followerId: 'u1' }, { followerId: 'u2' }]);

    const result = await service.getFollowers('target', 'tenant1');
    expect(result).toEqual(['u1', 'u2']);
  });

  // Test 6: getFollowing returns correct user IDs
  it('getFollowing returns following IDs for given user', async () => {
    setupSelect([{ followingId: 'u3' }, { followingId: 'u4' }]);

    const result = await service.getFollowing('user1', 'tenant1');
    expect(result).toEqual(['u3', 'u4']);
  });

  // Test 7: isFollowing returns correct boolean
  it('isFollowing returns true when follow record exists', async () => {
    setupSelect([{ id: 'row1' }]);
    const result = await service.isFollowing('f1', 'f2', 't1');
    expect(result).toBe(true);
  });

  // Test 7b: isFollowing returns false when no record
  it('isFollowing returns false when no follow record exists', async () => {
    setupSelect([]);
    const result = await service.isFollowing('f1', 'f2', 't1');
    expect(result).toBe(false);
  });

  // Test 8: getMutualFollowers returns intersection
  it('getMutualFollowers returns intersection of follower sets', async () => {
    // First call: followers of userId1 = ['u1', 'u2', 'u3']
    // Second call: followers of userId2 = ['u2', 'u3', 'u4']
    // Mutual = ['u2', 'u3']
    let callCount = 0;
    mockTx.select.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1)
              return [
                { followerId: 'u1' },
                { followerId: 'u2' },
                { followerId: 'u3' },
              ];
            return [
              { followerId: 'u2' },
              { followerId: 'u3' },
              { followerId: 'u4' },
            ];
          }),
        }),
      }),
    }));

    const result = await service.getMutualFollowers(
      'user1',
      'user2',
      'tenant1'
    );
    expect(result).toContain('u2');
    expect(result).toContain('u3');
    expect(result).not.toContain('u1');
    expect(result).not.toContain('u4');
  });

  describe('getSocialFeed', () => {
    it('returns empty array when user follows nobody', async () => {
      vi.spyOn(service, 'getFollowing').mockResolvedValue([]);
      const result = await service.getSocialFeed('user-1', 'tenant-1', 20);
      expect(result).toEqual([]);
    });

    it('returns feed items from followed users ordered by createdAt desc', async () => {
      vi.spyOn(service, 'getFollowing').mockResolvedValue(['user-2', 'user-3']);
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      await service.getSocialFeed('user-1', 'tenant-1', 20);
      expect(service.getFollowing).toHaveBeenCalledWith('user-1', 'tenant-1', 100);
    });

    it('respects the limit parameter', async () => {
      vi.spyOn(service, 'getFollowing').mockResolvedValue(['user-2']);
      mockTx.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      await service.getSocialFeed('user-1', 'tenant-1', 5);
      expect(service.getFollowing).toHaveBeenCalledWith('user-1', 'tenant-1', 100);
    });
  });

  describe('searchUsers', () => {
    it('returns empty array for queries shorter than 3 characters', async () => {
      const result = await service.searchUsers('ab', 'tenant-1', 20);
      expect(result).toEqual([]);
    });

    it('returns empty array for a 2-char query without touching the DB', async () => {
      const result = await service.searchUsers('xy', 'tenant-1', 20);
      expect(result).toEqual([]);
      expect(mockTx.select).not.toHaveBeenCalled();
    });
  });
});
