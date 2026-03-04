/**
 * Unit tests for SocialRecommendationsService (F-036).
 * SocialRecommendationsDataService is mocked — no real database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialRecommendationsService } from './social-recommendations.service';
import type { SocialRecommendationsDataService } from './social-recommendations-data.service';
import type { ActivityRow } from './social-recommendations-data.service';

// ─── Mock closeAllPools ─────────────────────────────────────────────────────
vi.mock('@edusphere/db', () => ({
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ─── Shared fixtures ────────────────────────────────────────────────────────
const TENANT = 'tenant-uuid';
const USER = 'user-uuid';
const FOLLOWED_A = 'followed-uuid-a';
const FOLLOWED_B = 'followed-uuid-b';

const CONTENT_1: ActivityRow = {
  contentItemId: 'content-1',
  contentTitle: 'GraphQL Fundamentals',
  userId: FOLLOWED_A,
  lastAccessedAt: new Date(),
  isCompleted: false,
};
const CONTENT_2: ActivityRow = {
  contentItemId: 'content-2',
  contentTitle: 'Docker for Devs',
  userId: FOLLOWED_B,
  lastAccessedAt: new Date(),
  isCompleted: false,
};

// ─── Data service mock factory ──────────────────────────────────────────────
function makeDataService(overrides: Partial<{
  followedIds: string[];
  mutualIds: string[];
  completedIds: Set<string>;
  activityRows: ActivityRow[];
  feedRows: unknown[];
}>): SocialRecommendationsDataService {
  return {
    getFollowedUserIds: vi.fn().mockResolvedValue(overrides.followedIds ?? []),
    getMutualFollowerIds: vi.fn().mockResolvedValue(overrides.mutualIds ?? []),
    getCompletedContentIds: vi.fn().mockResolvedValue(overrides.completedIds ?? new Set()),
    getFollowedActivity: vi.fn().mockResolvedValue(overrides.activityRows ?? []),
    getSocialFeedRows: vi.fn().mockResolvedValue(overrides.feedRows ?? []),
  } as unknown as SocialRecommendationsDataService;
}

// ─── Tests ──────────────────────────────────────────────────────────────────
describe('SocialRecommendationsService', () => {
  let service: SocialRecommendationsService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  it('getRecommendations returns empty when user follows nobody', async () => {
    const data = makeDataService({ followedIds: [] });
    service = new SocialRecommendationsService(data);

    const result = await service.getRecommendations(USER, TENANT);

    expect(result).toHaveLength(0);
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  it('getRecommendations excludes already-completed content', async () => {
    const data = makeDataService({
      followedIds: [FOLLOWED_A],
      mutualIds: [],
      completedIds: new Set(['content-1']),
      activityRows: [CONTENT_1],
    });
    service = new SocialRecommendationsService(data);

    const result = await service.getRecommendations(USER, TENANT);

    // content-1 should be excluded since USER completed it
    expect(result.find((r) => r.contentItemId === 'content-1')).toBeUndefined();
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  it('getRecommendations ranks by follower count descending', async () => {
    const data = makeDataService({
      followedIds: [FOLLOWED_A, FOLLOWED_B],
      mutualIds: [],
      completedIds: new Set(),
      activityRows: [
        { ...CONTENT_1, userId: FOLLOWED_A },
        { ...CONTENT_1, userId: FOLLOWED_B },
        CONTENT_2,
      ],
    });
    service = new SocialRecommendationsService(data);

    const result = await service.getRecommendations(USER, TENANT);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.contentItemId).toBe('content-1');
    expect(result[0]?.followersCount).toBe(2);
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  it('getRecommendations gives mutual followers 2x weight boost', async () => {
    // FOLLOWED_A is a mutual follower (also follows USER back)
    const data = makeDataService({
      followedIds: [FOLLOWED_A, FOLLOWED_B],
      mutualIds: [FOLLOWED_A],
      completedIds: new Set(),
      activityRows: [
        { ...CONTENT_2, userId: FOLLOWED_A },   // mutual: weight += 2
        { ...CONTENT_1, userId: FOLLOWED_B },   // non-mutual: weight += 1
      ],
    });
    service = new SocialRecommendationsService(data);

    const result = await service.getRecommendations(USER, TENANT);

    const rec2 = result.find((r) => r.contentItemId === 'content-2');
    const rec1 = result.find((r) => r.contentItemId === 'content-1');
    expect(rec2).toBeDefined();
    expect(rec1).toBeDefined();
    expect(rec2!.weight).toBeGreaterThan(rec1!.weight);
    expect(rec2!.isMutualFollower).toBe(true);
    expect(result[0]?.contentItemId).toBe('content-2');
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  it('getSocialFeed returns recent activity of followed users', async () => {
    const data = makeDataService({
      followedIds: [FOLLOWED_A],
      feedRows: [
        {
          user_id: FOLLOWED_A,
          display_name: 'Alice',
          content_item_id: 'content-1',
          content_title: 'GraphQL Fundamentals',
          is_completed: true,
          progress: 100,
          last_accessed_at: new Date(),
        },
      ],
    });
    service = new SocialRecommendationsService(data);

    const feed = await service.getSocialFeed(USER, TENANT);

    expect(feed).toHaveLength(1);
    expect(feed[0]?.userId).toBe(FOLLOWED_A);
    expect(feed[0]?.action).toBe('completed');
    expect(feed[0]?.contentTitle).toBe('GraphQL Fundamentals');
  });

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  it('getSocialFeed returns empty when no recent activity', async () => {
    const data = makeDataService({
      followedIds: [FOLLOWED_A],
      feedRows: [],
    });
    service = new SocialRecommendationsService(data);

    const feed = await service.getSocialFeed(USER, TENANT);

    expect(feed).toHaveLength(0);
  });
});
