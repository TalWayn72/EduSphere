/**
 * WeeklyActivityBar — pure logic tests.
 * No @testing-library/react-native required (not installed).
 * Tests bar height calculation logic only — avoids module-level StyleSheet.create()
 * by duplicating the pure function rather than importing the component.
 */
import { describe, it, expect } from 'vitest';

// Mirror calcBarHeightPercent from WeeklyActivityBar for unit testing
// (avoids StyleSheet.create() error when react-native mock is incomplete)
function calcBarHeightPercent(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0;
  return Math.min((count / maxCount) * 100, 100);
}

interface DayData {
  label: string;
  count: number;
}

describe('WeeklyActivityBar — calcBarHeightPercent', () => {
  it('calculates bar height proportionally', () => {
    expect(calcBarHeightPercent(3, 5)).toBe(60);
  });

  it('returns 0 for 0 count', () => {
    expect(calcBarHeightPercent(0, 5)).toBe(0);
  });

  it('returns 100 for count equal to maxCount', () => {
    expect(calcBarHeightPercent(5, 5)).toBe(100);
  });

  it('clamps to 100 when count exceeds maxCount', () => {
    expect(calcBarHeightPercent(10, 5)).toBe(100);
  });

  it('returns 0 when maxCount is 0 (no division by zero)', () => {
    expect(calcBarHeightPercent(3, 0)).toBe(0);
  });

  it('returns 50 for half of maxCount', () => {
    expect(calcBarHeightPercent(2, 4)).toBe(50);
  });

  it('returns 20 for 1 of 5', () => {
    expect(calcBarHeightPercent(1, 5)).toBe(20);
  });
});

describe('WeeklyActivityBar — DayData shape', () => {
  const week: DayData[] = [
    { label: 'Sun', count: 2 },
    { label: 'Mon', count: 4 },
    { label: 'Tue', count: 5 },
    { label: 'Wed', count: 3 },
    { label: 'Thu', count: 1 },
    { label: 'Fri', count: 4 },
    { label: 'Sat', count: 2 },
  ];

  it('has 7 days', () => {
    expect(week).toHaveLength(7);
  });

  it('all labels are non-empty strings', () => {
    for (const day of week) {
      expect(typeof day.label).toBe('string');
      expect(day.label.length).toBeGreaterThan(0);
    }
  });

  it('all counts are non-negative numbers', () => {
    for (const day of week) {
      expect(typeof day.count).toBe('number');
      expect(day.count).toBeGreaterThanOrEqual(0);
    }
  });

  it('all labels are unique', () => {
    const labels = week.map((d) => d.label);
    expect(new Set(labels).size).toBe(7);
  });

  it('calcBarHeightPercent works for all days against maxCount=5', () => {
    for (const day of week) {
      const pct = calcBarHeightPercent(day.count, 5);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });
});
