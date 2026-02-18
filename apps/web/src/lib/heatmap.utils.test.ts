import { describe, it, expect } from 'vitest';
import { getHeatmapColor, formatHeatmapDate, calcHeatmapStats } from './heatmap.utils';

describe('getHeatmapColor', () => {
  it('returns bg-muted for count 0', () => {
    expect(getHeatmapColor(0)).toBe('bg-muted');
  });

  it('returns green-200 for count 1', () => {
    expect(getHeatmapColor(1)).toContain('bg-green-200');
  });

  it('returns green-200 for count 2 (upper boundary)', () => {
    expect(getHeatmapColor(2)).toContain('bg-green-200');
  });

  it('returns green-400 for count 3', () => {
    expect(getHeatmapColor(3)).toContain('bg-green-400');
  });

  it('returns green-400 for count 4 (upper boundary)', () => {
    expect(getHeatmapColor(4)).toContain('bg-green-400');
  });

  it('returns green-600 for count 5', () => {
    expect(getHeatmapColor(5)).toContain('bg-green-600');
  });

  it('returns green-600 for count 6 (upper boundary)', () => {
    expect(getHeatmapColor(6)).toContain('bg-green-600');
  });

  it('returns green-800 for count 7', () => {
    expect(getHeatmapColor(7)).toContain('bg-green-800');
  });

  it('returns green-800 for very high counts', () => {
    expect(getHeatmapColor(100)).toContain('bg-green-800');
  });
});

describe('formatHeatmapDate', () => {
  it('formats ISO date to short month and day', () => {
    const result = formatHeatmapDate('2024-01-15');
    expect(result).toMatch(/Jan\s+15|Jan 15/);
  });

  it('formats december correctly', () => {
    const result = formatHeatmapDate('2024-12-31');
    expect(result).toMatch(/Dec\s+31|Dec 31/);
  });

  it('returns a non-empty string', () => {
    expect(formatHeatmapDate('2024-06-01').length).toBeGreaterThan(0);
  });
});

describe('calcHeatmapStats', () => {
  it('counts days with activity correctly', () => {
    const data = [
      { date: '2024-01-01', count: 0 },
      { date: '2024-01-02', count: 3 },
      { date: '2024-01-03', count: 0 },
      { date: '2024-01-04', count: 5 },
    ];
    const { totalStudyDays } = calcHeatmapStats(data);
    expect(totalStudyDays).toBe(2);
  });

  it('sums all sessions correctly', () => {
    const data = [
      { date: '2024-01-01', count: 2 },
      { date: '2024-01-02', count: 3 },
      { date: '2024-01-03', count: 0 },
      { date: '2024-01-04', count: 5 },
    ];
    const { totalSessions } = calcHeatmapStats(data);
    expect(totalSessions).toBe(10);
  });

  it('returns 0 for empty data', () => {
    const { totalStudyDays, totalSessions } = calcHeatmapStats([]);
    expect(totalStudyDays).toBe(0);
    expect(totalSessions).toBe(0);
  });

  it('returns 0 study days when all counts are 0', () => {
    const data = [
      { date: '2024-01-01', count: 0 },
      { date: '2024-01-02', count: 0 },
    ];
    const { totalStudyDays } = calcHeatmapStats(data);
    expect(totalStudyDays).toBe(0);
  });
});
