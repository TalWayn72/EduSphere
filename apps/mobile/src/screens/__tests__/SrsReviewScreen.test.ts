/**
 * SrsReviewScreen — pure logic tests.
 * No @testing-library/react-native required (not installed).
 * Imports pure helper functions from srs.logic.ts directly.
 */
import { describe, it, expect } from 'vitest';
import {
  computeSessionStats,
  advanceCard,
  formatDueDate,
  computeLevel,
} from '../srs.logic';

// ---------------------------------------------------------------------------
// computeSessionStats
// ---------------------------------------------------------------------------
describe('SRS logic — computeSessionStats', () => {
  it('counts correct ratings (quality >= 3)', () => {
    const ratings = [
      { cardId: '1', quality: 3 },
      { cardId: '2', quality: 5 },
      { cardId: '3', quality: 1 },
      { cardId: '4', quality: 0 },
    ];
    const stats = computeSessionStats(ratings);
    expect(stats.correct).toBe(2);
    expect(stats.total).toBe(4);
    expect(stats.reviewed).toBe(4);
  });

  it('returns zero correct for all low quality ratings', () => {
    const ratings = [
      { cardId: '1', quality: 0 },
      { cardId: '2', quality: 2 },
    ];
    const stats = computeSessionStats(ratings);
    expect(stats.correct).toBe(0);
    expect(stats.total).toBe(2);
  });

  it('returns all correct when every rating is quality >= 3', () => {
    const ratings = [
      { cardId: '1', quality: 3 },
      { cardId: '2', quality: 4 },
      { cardId: '3', quality: 5 },
    ];
    const stats = computeSessionStats(ratings);
    expect(stats.correct).toBe(3);
  });

  it('returns empty stats for empty input', () => {
    const stats = computeSessionStats([]);
    expect(stats.total).toBe(0);
    expect(stats.correct).toBe(0);
    expect(stats.reviewed).toBe(0);
  });

  it('treats quality === 3 as correct (boundary)', () => {
    const stats = computeSessionStats([{ cardId: 'x', quality: 3 }]);
    expect(stats.correct).toBe(1);
  });

  it('treats quality === 2 as incorrect (boundary)', () => {
    const stats = computeSessionStats([{ cardId: 'x', quality: 2 }]);
    expect(stats.correct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// advanceCard
// ---------------------------------------------------------------------------
describe('SRS logic — advanceCard', () => {
  it('advances to the next index', () => {
    expect(advanceCard(0, 5)).toBe(1);
    expect(advanceCard(3, 5)).toBe(4);
  });

  it('returns null at the last card', () => {
    expect(advanceCard(4, 5)).toBeNull();
  });

  it('returns null when there is only one card', () => {
    expect(advanceCard(0, 1)).toBeNull();
  });

  it('handles first card of a large deck', () => {
    expect(advanceCard(0, 50)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// formatDueDate
// ---------------------------------------------------------------------------
describe('SRS logic — formatDueDate', () => {
  it('returns "Due today" for a past date', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(formatDueDate(yesterday)).toBe('Due today');
  });

  it('returns "Due today" for the current moment', () => {
    expect(formatDueDate(new Date().toISOString())).toBe('Due today');
  });

  it('returns "Due tomorrow" for exactly 1 day ahead', () => {
    const tomorrow = new Date(Date.now() + 86400000 * 1.5).toISOString();
    expect(formatDueDate(tomorrow)).toBe('Due tomorrow');
  });

  it('returns "Due in N days" for future dates', () => {
    const future = new Date(Date.now() + 86400000 * 7).toISOString();
    const result = formatDueDate(future);
    expect(result).toMatch(/^Due in \d+ days$/);
  });

  it('contains the correct number of days for a 10-day future date', () => {
    const future = new Date(Date.now() + 86400000 * 10.5).toISOString();
    expect(formatDueDate(future)).toBe('Due in 10 days');
  });
});

// ---------------------------------------------------------------------------
// computeLevel
// ---------------------------------------------------------------------------
describe('SRS logic — computeLevel', () => {
  it('returns 1 for 0 XP', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('returns 2 for 100 XP', () => {
    expect(computeLevel(100)).toBe(2);
  });

  it('never returns less than 1', () => {
    expect(computeLevel(0)).toBeGreaterThanOrEqual(1);
  });
});
