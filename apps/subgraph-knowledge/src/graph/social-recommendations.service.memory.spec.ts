/**
 * social-recommendations.service.memory.spec.ts
 *
 * Memory-safety tests for SocialRecommendationsService.
 * Verifies:
 *   1. onModuleDestroy() calls closeAllPools() (fire-and-forget pattern).
 *   2. onModuleDestroy() does not throw when closeAllPools() rejects.
 *   3. getRecommendations() returns [] without retaining resources when
 *      followedIds is empty (no unbounded accumulation).
 *   4. Multiple destroy calls don't cause unhandled rejections.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist DB mock ─────────────────────────────────────────────────────────────

const { mockCloseAllPools } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  return { mockCloseAllPools };
});

vi.mock('@edusphere/db', () => ({
  closeAllPools: mockCloseAllPools,
  db: {},
  withTenantContext: vi.fn().mockResolvedValue([]),
  userFollows: { followingId: 'followingId', followerId: 'followerId', tenantId: 'tenantId' },
  userProgress: { userId: 'userId', contentItemId: 'contentItemId', isCompleted: 'isCompleted' },
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('./graph-types.js', () => ({
  toUserRole: vi.fn().mockReturnValue('STUDENT'),
}));

vi.mock('./social-recommendations-aggregate.js', () => ({
  aggregateActivity: vi.fn().mockReturnValue([]),
}));

import { SocialRecommendationsService } from './social-recommendations.service.js';
import { SocialRecommendationsDataService } from './social-recommendations-data.service.js';

function makeDataService(): SocialRecommendationsDataService {
  return {
    getFollowedUserIds: vi.fn().mockResolvedValue([]),
    getMutualFollowerIds: vi.fn().mockResolvedValue([]),
    getCompletedContentIds: vi.fn().mockResolvedValue(new Set<string>()),
    getFollowedActivity: vi.fn().mockResolvedValue([]),
    getSocialFeedRows: vi.fn().mockResolvedValue([]),
  } as unknown as SocialRecommendationsDataService;
}

function makeService(
  data?: SocialRecommendationsDataService
): SocialRecommendationsService {
  return new SocialRecommendationsService(data ?? makeDataService());
}

describe('SocialRecommendationsService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: onModuleDestroy calls closeAllPools ───────────────────────────
  it('onModuleDestroy() calls closeAllPools()', async () => {
    const svc = makeService();
    svc.onModuleDestroy();
    // Fire-and-forget: give the microtask queue a tick to resolve
    await Promise.resolve();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: onModuleDestroy does not throw when closeAllPools rejects ─────
  it('onModuleDestroy() does not throw when closeAllPools() rejects', async () => {
    mockCloseAllPools.mockRejectedValueOnce(new Error('pool close failed'));
    const svc = makeService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    // Allow the rejected promise to settle so it doesn't leak
    await Promise.resolve();
  });

  // ── Test 3: getRecommendations returns [] when no follows ─────────────────
  it('getRecommendations() returns [] without retaining resources when followedIds is empty', async () => {
    const data = makeDataService();
    vi.mocked(data.getFollowedUserIds).mockResolvedValue([]);
    const svc = makeService(data);

    const result = await svc.getRecommendations('user-1', 'tenant-1', 10);

    expect(result).toEqual([]);
    // Only getFollowedUserIds should have been called — no further DB queries
    expect(data.getMutualFollowerIds).not.toHaveBeenCalled();
    expect(data.getFollowedActivity).not.toHaveBeenCalled();

    svc.onModuleDestroy();
    await Promise.resolve();
  });

  // ── Test 4: multiple destroy calls do not cause unhandled rejections ──────
  it('calling onModuleDestroy() twice does not cause unhandled rejections', async () => {
    const svc = makeService();
    svc.onModuleDestroy();
    svc.onModuleDestroy();
    await Promise.resolve();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });
});
