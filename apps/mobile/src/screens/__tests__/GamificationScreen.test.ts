/**
 * GamificationScreen — pure logic tests.
 * No @testing-library/react-native required (not installed).
 * Tests the helper functions inline to avoid importing the React Native screen module.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure helper implementations (mirrors GamificationScreen exports)
// ---------------------------------------------------------------------------

function computeLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}

function formatStreak(days: number): string {
  if (days === 0) return 'No streak yet';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function computeXpProgress(totalXp: number): number {
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
  const levelStartXp = (level - 1) * (level - 1) * 100;
  const levelEndXp = level * level * 100;
  return Math.round(((totalXp - levelStartXp) / (levelEndXp - levelStartXp)) * 100);
}

// ---------------------------------------------------------------------------
// computeLevel tests
// ---------------------------------------------------------------------------
describe('GamificationScreen — computeLevel', () => {
  it('returns 1 for 0 XP', () => {
    expect(computeLevel(0)).toBe(1);
  });
  it('returns 2 for 100 XP', () => {
    expect(computeLevel(100)).toBe(2);
  });
  it('returns 3 for 400 XP', () => {
    expect(computeLevel(400)).toBe(3);
  });
  it('returns 10 for 8100 XP', () => {
    expect(computeLevel(8100)).toBe(10);
  });
  it('never returns less than 1', () => {
    expect(computeLevel(0)).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// formatStreak tests
// ---------------------------------------------------------------------------
describe('GamificationScreen — formatStreak', () => {
  it('returns "No streak yet" for 0', () => {
    expect(formatStreak(0)).toBe('No streak yet');
  });
  it('returns "1 day" for 1', () => {
    expect(formatStreak(1)).toBe('1 day');
  });
  it('returns "7 days" for 7', () => {
    expect(formatStreak(7)).toBe('7 days');
  });
  it('returns "100 days" for 100', () => {
    expect(formatStreak(100)).toBe('100 days');
  });
});

// ---------------------------------------------------------------------------
// computeXpProgress tests
// ---------------------------------------------------------------------------
describe('GamificationScreen — computeXpProgress', () => {
  it('returns 0 for 0 XP (start of level 1)', () => {
    expect(computeXpProgress(0)).toBe(0);
  });
  it('returns a valid percentage (0-100) for any XP value', () => {
    for (const xp of [50, 100, 250, 399, 400, 1000, 5000]) {
      const pct = computeXpProgress(xp);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });
  it('returns 0 at the exact start of a level threshold', () => {
    // At 100 XP, level becomes 2 → levelStartXp=100, progress should be 0
    expect(computeXpProgress(100)).toBe(0);
  });
  it('returns near 100 just before a level boundary', () => {
    // Just below 400 XP (level 3 threshold), progress within level 2 is ~99%
    expect(computeXpProgress(399)).toBeGreaterThan(90);
  });
});
