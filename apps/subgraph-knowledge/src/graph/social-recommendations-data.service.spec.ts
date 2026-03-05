/**
 * social-recommendations-data.service.spec.ts
 * Unit tests for SocialRecommendationsDataService.
 * Mocks @edusphere/db follow/progress tables.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn(mockTx)
);

const mockTx = {
  select: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  db: {},
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  })),
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  userFollows: { followingId: 'followingId', followerId: 'followerId', tenantId: 'tenantId' },
  userProgress: {
    userId: 'userId',
    contentItemId: 'contentItemId',
    isCompleted: 'isCompleted',
    lastAccessedAt: 'lastAccessedAt',
    progress: 'progress',
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

import { SocialRecommendationsDataService } from './social-recommendations-data.service.js';

const CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'STUDENT' as const };

describe('SocialRecommendationsDataService', () => {
  let service: SocialRecommendationsDataService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SocialRecommendationsDataService();
  });

  // ── getFollowedUserIds ────────────────────────────────────────────────────

  it('returns list of followed user IDs', async () => {
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { followingId: 'user-2' },
          { followingId: 'user-3' },
        ]),
      }),
    });
    const ids = await service.getFollowedUserIds('user-1', 'tenant-1', CTX);
    expect(ids).toEqual(['user-2', 'user-3']);
  });

  it('returns empty array when user follows nobody', async () => {
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const ids = await service.getFollowedUserIds('user-1', 'tenant-1', CTX);
    expect(ids).toEqual([]);
  });

  // ── getMutualFollowerIds ──────────────────────────────────────────────────

  it('returns intersection of followers and followed', async () => {
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { followerId: 'user-2' },
          { followerId: 'user-5' },
        ]),
      }),
    });
    const mutual = await service.getMutualFollowerIds(
      'user-1',
      'tenant-1',
      ['user-2', 'user-3'],
      CTX
    );
    expect(mutual).toEqual(['user-2']); // user-5 not in followedIds
  });

  // ── getCompletedContentIds ────────────────────────────────────────────────

  it('returns Set of completed content item IDs', async () => {
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { contentItemId: 'ci-1' },
          { contentItemId: 'ci-2' },
        ]),
      }),
    });
    const set = await service.getCompletedContentIds('user-1', CTX);
    expect(set.has('ci-1')).toBe(true);
    expect(set.has('ci-2')).toBe(true);
    expect(set.size).toBe(2);
  });

  // ── getFollowedActivity ───────────────────────────────────────────────────

  it('maps raw rows to ActivityRow shape', async () => {
    const rawRow = {
      content_item_id: 'ci-10',
      content_title: 'React Hooks',
      user_id: 'user-2',
      last_accessed_at: new Date('2026-01-01'),
      is_completed: false,
    };
    mockTx.execute.mockResolvedValue({ rows: [rawRow] });
    const activity = await service.getFollowedActivity(
      ['user-2'],
      new Date('2025-12-01'),
      CTX
    );
    expect(activity).toHaveLength(1);
    expect(activity[0].contentItemId).toBe('ci-10');
    expect(activity[0].contentTitle).toBe('React Hooks');
  });
});
