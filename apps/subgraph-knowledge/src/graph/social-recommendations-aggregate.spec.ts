import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateActivity } from './social-recommendations-aggregate';
import type { ActivityRow } from './social-recommendations-data.service';


// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRow(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    contentItemId: 'content-1',
    contentTitle: 'Intro to Math',
    userId: 'user-1',
    lastAccessedAt: new Date('2026-01-01'),
    isCompleted: false,
    ...overrides,
  };
}

describe('aggregateActivity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array for empty rows', () => {
    const result = aggregateActivity([], new Set(), new Set());
    expect(result).toEqual([]);
  });

  it('aggregates a single activity row', () => {
    const rows = [makeRow()];
    const result = aggregateActivity(rows, new Set(), new Set());
    expect(result).toHaveLength(1);
    expect(result[0]!.contentItemId).toBe('content-1');
    expect(result[0]!.followersCount).toBe(1);
    expect(result[0]!.weight).toBe(1);
  });

  it('skips content already completed by the user', () => {
    const rows = [makeRow({ contentItemId: 'done-1' })];
    const completed = new Set(['done-1']);
    const result = aggregateActivity(rows, completed, new Set());
    expect(result).toHaveLength(0);
  });

  it('doubles weight for mutual followers', () => {
    const rows = [makeRow({ userId: 'mutual-user' })];
    const mutualSet = new Set(['mutual-user']);
    const result = aggregateActivity(rows, new Set(), mutualSet);
    expect(result[0]!.weight).toBe(2);
    expect(result[0]!.isMutualFollower).toBe(true);
  });

  it('aggregates multiple rows for same content', () => {
    const rows = [
      makeRow({ userId: 'u1' }),
      makeRow({ userId: 'u2' }),
      makeRow({ userId: 'u3' }),
    ];
    const result = aggregateActivity(rows, new Set(), new Set());
    expect(result).toHaveLength(1);
    expect(result[0]!.followersCount).toBe(3);
    expect(result[0]!.weight).toBe(3);
  });

  it('tracks latest activity date', () => {
    const rows = [
      makeRow({ userId: 'u1', lastAccessedAt: new Date('2026-01-01') }),
      makeRow({ userId: 'u2', lastAccessedAt: new Date('2026-06-15') }),
      makeRow({ userId: 'u3', lastAccessedAt: new Date('2026-03-01') }),
    ];
    const result = aggregateActivity(rows, new Set(), new Set());
    expect(result[0]!.lastActivity).toEqual(new Date('2026-06-15'));
  });

  it('sets isMutualFollower to true if any contributor is mutual', () => {
    const rows = [
      makeRow({ userId: 'u1' }),
      makeRow({ userId: 'u2' }),
    ];
    const mutualSet = new Set(['u2']);
    const result = aggregateActivity(rows, new Set(), mutualSet);
    expect(result[0]!.isMutualFollower).toBe(true);
  });

  it('handles multiple different content items', () => {
    const rows = [
      makeRow({ contentItemId: 'c1', contentTitle: 'Math' }),
      makeRow({ contentItemId: 'c2', contentTitle: 'Science' }),
    ];
    const result = aggregateActivity(rows, new Set(), new Set());
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.contentItemId).sort();
    expect(ids).toEqual(['c1', 'c2']);
  });

  it('accumulates weight correctly with mixed mutual/non-mutual', () => {
    const rows = [
      makeRow({ userId: 'u1' }),
      makeRow({ userId: 'u2' }),
      makeRow({ userId: 'u3' }),
    ];
    const mutualSet = new Set(['u1', 'u3']);
    const result = aggregateActivity(rows, new Set(), mutualSet);
    // u1: +2 (mutual), u2: +1 (regular), u3: +2 (mutual) = 5
    expect(result[0]!.weight).toBe(5);
    expect(result[0]!.followersCount).toBe(3);
  });

  it('non-mutual first row has isMutualFollower false', () => {
    const rows = [makeRow({ userId: 'regular-user' })];
    const result = aggregateActivity(rows, new Set(), new Set());
    expect(result[0]!.isMutualFollower).toBe(false);
  });

  it('skips completed and keeps non-completed', () => {
    const rows = [
      makeRow({ contentItemId: 'done' }),
      makeRow({ contentItemId: 'pending' }),
    ];
    const completed = new Set(['done']);
    const result = aggregateActivity(rows, completed, new Set());
    expect(result).toHaveLength(1);
    expect(result[0]!.contentItemId).toBe('pending');
  });
});
