/**
 * Memory safety tests for SocialService.
 * Verifies NATS connection and DB pools are cleaned up in onModuleDestroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { drainMock, mockNatsConn, mockTx } = vi.hoisted(() => {
  const drainMock = vi.fn().mockResolvedValue(undefined);
  const mockNatsConn = {
    publish: vi.fn(),
    drain: drainMock,
  };
  const mockTx = {
    delete: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    }),
  };
  return { drainMock, mockNatsConn, mockTx };
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
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('nats', () => ({ connect: vi.fn().mockResolvedValue(mockNatsConn) }));
vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

import { SocialService } from './social.service';
import { closeAllPools } from '@edusphere/db';

describe('SocialService memory safety', () => {
  let service: SocialService;

  beforeEach(() => {
    vi.clearAllMocks();
    drainMock.mockResolvedValue(undefined);
    service = new SocialService();
  });

  // Test 1: onModuleDestroy calls closeAllPools
  it('calls closeAllPools on destroy', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  // Test 2: NATS connection drained on destroy
  it('drains NATS connection on destroy', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(drainMock).toHaveBeenCalledTimes(1);
  });

  // Test 3: Concurrent follows don't corrupt state
  it('concurrent followUser calls resolve independently without state corruption', async () => {
    let resolveA!: () => void;
    let resolveB!: () => void;

    const slowInsert = (id: string) =>
      new Promise<void>((resolve) => {
        if (id === 'A') resolveA = resolve;
        else resolveB = resolve;
      });

    const insertValues = vi.fn();
    mockTx.insert.mockReturnValue({
      values: insertValues.mockImplementation(
        ({ followerId }: { followerId: string }) => ({
          onConflictDoNothing: () =>
            slowInsert(followerId === 'followerA' ? 'A' : 'B'),
        })
      ),
    });

    const promiseA = service.followUser('followerA', 'following1', 'tenant1');
    const promiseB = service.followUser('followerB', 'following1', 'tenant1');

    resolveA();
    resolveB();

    const [resultA, resultB] = await Promise.all([promiseA, promiseB]);
    expect(resultA).toBe(true);
    expect(resultB).toBe(true);
    expect(insertValues).toHaveBeenCalledTimes(2);
  });
});
