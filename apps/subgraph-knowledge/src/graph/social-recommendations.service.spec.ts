/**
 * Unit tests for SocialRecommendationsService (F-036).
 * All DB calls are mocked — no real database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialRecommendationsService } from './social-recommendations.service';

// ─── Mock DB layer ─────────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockExecute = vi.fn();

const mockTx = {
  select: mockSelect,
  execute: mockExecute,
};

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, cb: (tx: unknown) => unknown) =>
      cb(mockTx)
  ),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  userFollows: {
    followerId: 'follower_id',
    followingId: 'following_id',
    tenantId: 'tenant_id',
  },
  userProgress: {
    userId: 'user_id',
    contentItemId: 'content_item_id',
    isCompleted: 'is_completed',
  },
  contentItems: { id: 'id', title: 'title' },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  inArray: vi.fn((col: unknown, vals: unknown) => ({ col, vals })),
  sql: Object.assign(
    vi.fn((...args: unknown[]) => args),
    { raw: vi.fn() }
  ),
}));

// ─── Shared fixtures ───────────────────────────────────────────────────────────
const TENANT = 'tenant-uuid';
const USER = 'user-uuid';
const FOLLOWED_A = 'followed-uuid-a';
const FOLLOWED_B = 'followed-uuid-b';

const CONTENT_1 = {
  content_item_id: 'content-1',
  content_title: 'GraphQL Fundamentals',
  user_id: FOLLOWED_A,
  last_accessed_at: new Date(),
  is_completed: false,
};
const CONTENT_2 = {
  content_item_id: 'content-2',
  content_title: 'Docker for Devs',
  user_id: FOLLOWED_B,
  last_accessed_at: new Date(),
  is_completed: false,
};
const _CONTENT_3 = {
  content_item_id: 'content-3',
  content_title: 'Already Done',
  user_id: FOLLOWED_A,
  last_accessed_at: new Date(),
  is_completed: false,
};

function makeService() {
  return new SocialRecommendationsService();
}

// ─── Helper: setup mock select chains ─────────────────────────────────────────
function setupSelectChain(returnValue: unknown) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(returnValue),
  });
}

function setupExecuteResult(rows: unknown[]) {
  mockExecute.mockResolvedValueOnce({ rows });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe('SocialRecommendationsService', () => {
  let service: SocialRecommendationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = makeService();
  });

  // ── Test 1 ───────────────────────────────────────────────────────────────────
  it('getRecommendations returns empty when user follows nobody', async () => {
    // Step 1: getFollowedUserIds returns []
    setupSelectChain([]);

    const result = await service.getRecommendations(USER, TENANT);

    expect(result).toHaveLength(0);
  });

  // ── Test 2 ───────────────────────────────────────────────────────────────────
  it('getRecommendations excludes already-completed content', async () => {
    // Step 1: getFollowedUserIds
    setupSelectChain([{ followingId: FOLLOWED_A }]);
    // Step 2: getMutualFollowerIds — followers of USER
    setupSelectChain([]);
    // Step 3: getCompletedContentIds — USER has completed content-1
    setupSelectChain([{ contentItemId: 'content-1' }]);
    // Step 4: getFollowedActivity — FOLLOWED_A is studying content-1
    setupExecuteResult([CONTENT_1]);

    const result = await service.getRecommendations(USER, TENANT);

    // content-1 should be excluded since USER completed it
    expect(result.find((r) => r.contentItemId === 'content-1')).toBeUndefined();
  });

  // ── Test 3 ───────────────────────────────────────────────────────────────────
  it('getRecommendations ranks by follower count descending', async () => {
    // Step 1: getFollowedUserIds — two followed users
    setupSelectChain([
      { followingId: FOLLOWED_A },
      { followingId: FOLLOWED_B },
    ]);
    // Step 2: getMutualFollowerIds — no mutual followers
    setupSelectChain([]);
    // Step 3: getCompletedContentIds — USER has completed nothing
    setupSelectChain([]);
    // Step 4: getFollowedActivity — both study content-1, only B studies content-2
    setupExecuteResult([
      { ...CONTENT_1, user_id: FOLLOWED_A },
      { ...CONTENT_1, user_id: FOLLOWED_B },
      CONTENT_2,
    ]);

    const result = await service.getRecommendations(USER, TENANT);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.contentItemId).toBe('content-1');
    expect(result[0]?.followersCount).toBe(2);
  });

  // ── Test 4 ───────────────────────────────────────────────────────────────────
  it('getRecommendations gives mutual followers 2x weight boost', async () => {
    // Step 1: followed users: A and B
    setupSelectChain([
      { followingId: FOLLOWED_A },
      { followingId: FOLLOWED_B },
    ]);
    // Step 2: getMutualFollowerIds — A follows USER back → A is mutual
    setupSelectChain([{ followerId: FOLLOWED_A }]);
    // Step 3: getCompletedContentIds — nothing completed
    setupSelectChain([]);
    // Step 4: FOLLOWED_A (mutual) studies content-2; FOLLOWED_B studies content-1
    setupExecuteResult([
      { ...CONTENT_2, user_id: FOLLOWED_A },
      { ...CONTENT_1, user_id: FOLLOWED_B },
    ]);

    const result = await service.getRecommendations(USER, TENANT);

    // content-2 studied by 1 mutual follower: weight = 1 + 1 = 2
    // content-1 studied by 1 non-mutual follower: weight = 1
    const rec2 = result.find((r) => r.contentItemId === 'content-2');
    const rec1 = result.find((r) => r.contentItemId === 'content-1');
    expect(rec2).toBeDefined();
    expect(rec1).toBeDefined();
    expect(rec2!.weight).toBeGreaterThan(rec1!.weight);
    expect(rec2!.isMutualFollower).toBe(true);
    expect(result[0]?.contentItemId).toBe('content-2');
  });

  // ── Test 5 ───────────────────────────────────────────────────────────────────
  it('getSocialFeed returns recent activity of followed users', async () => {
    // Step 1: getFollowedUserIds
    setupSelectChain([{ followingId: FOLLOWED_A }]);
    // Step 2: feed SQL query
    setupExecuteResult([
      {
        user_id: FOLLOWED_A,
        display_name: 'Alice',
        content_item_id: 'content-1',
        content_title: 'GraphQL Fundamentals',
        is_completed: true,
        progress: 100,
        last_accessed_at: new Date(),
      },
    ]);

    const feed = await service.getSocialFeed(USER, TENANT);

    expect(feed).toHaveLength(1);
    expect(feed[0]?.userId).toBe(FOLLOWED_A);
    expect(feed[0]?.action).toBe('completed');
    expect(feed[0]?.contentTitle).toBe('GraphQL Fundamentals');
  });

  // ── Test 6 ───────────────────────────────────────────────────────────────────
  it('getSocialFeed returns empty when no recent activity', async () => {
    // Step 1: getFollowedUserIds returns A
    setupSelectChain([{ followingId: FOLLOWED_A }]);
    // Step 2: feed SQL returns nothing
    setupExecuteResult([]);

    const feed = await service.getSocialFeed(USER, TENANT);

    expect(feed).toHaveLength(0);
  });
});
