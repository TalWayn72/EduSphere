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
  },
  withTenantContext: vi.fn(
    async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) => fn(mockTx)
  ),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
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
});
