/**
 * HomeScreen — pure logic tests
 * No @testing-library/react-native required.
 * Tests mock-data shape, theme token values, formatRelativeTime logic,
 * and resolveStats (real stats vs mock fallback).
 *
 * resolveStats is imported from lib/stats-utils (not HomeScreen) to avoid
 * module-level StyleSheet.create() error when react-native mock is incomplete.
 */
import { describe, it, expect } from 'vitest';
import { COLORS } from '../lib/theme';
import {
  MOCK_USER,
  MOCK_STATS,
  MOCK_RECENT_COURSES,
} from '../lib/mock-mobile-data';
import { resolveStats } from '../lib/stats-utils';

// Mirror formatRelativeTime from HomeScreen for unit testing
function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

describe('HomeScreen — design tokens (regression: no iOS blue)', () => {
  it('COLORS.primary is Indigo #6366F1, not iOS #007AFF', () => {
    expect(COLORS.primary).toBe('#6366F1');
    expect(COLORS.primary).not.toBe('#007AFF');
  });

  it('COLORS.warning is amber (used for streak display)', () => {
    expect(COLORS.warning).toBe('#F59E0B');
  });

  it('COLORS.success is green (used for study time stat)', () => {
    expect(COLORS.success).toBe('#10B981');
  });

  it('COLORS.accent is violet (used for concepts stat)', () => {
    expect(COLORS.accent).toBe('#8B5CF6');
  });
});

describe('HomeScreen — MOCK_USER shape', () => {
  it('has required fields', () => {
    expect(MOCK_USER.id).toBeTruthy();
    expect(MOCK_USER.firstName).toBeTruthy();
    expect(MOCK_USER.lastName).toBeTruthy();
    expect(MOCK_USER.email).toBeTruthy();
    expect(MOCK_USER.role).toBe('STUDENT');
  });
});

describe('HomeScreen — MOCK_STATS shape', () => {
  it('has activeCourses count', () => {
    expect(typeof MOCK_STATS.activeCourses).toBe('number');
    expect(MOCK_STATS.activeCourses).toBeGreaterThan(0);
  });

  it('has learningStreak (14 days)', () => {
    expect(MOCK_STATS.learningStreak).toBe(14);
  });

  it('has studyTimeMinutes for hours calculation', () => {
    expect(MOCK_STATS.studyTimeMinutes).toBeGreaterThan(0);
    const hours = Math.round(MOCK_STATS.studyTimeMinutes / 60);
    expect(hours).toBeGreaterThan(0);
  });

  it('has conceptsMastered', () => {
    expect(typeof MOCK_STATS.conceptsMastered).toBe('number');
    expect(MOCK_STATS.conceptsMastered).toBeGreaterThan(0);
  });
});

describe('HomeScreen — MOCK_RECENT_COURSES shape', () => {
  it('has 3 courses', () => {
    expect(MOCK_RECENT_COURSES).toHaveLength(3);
  });

  it('each course has required fields', () => {
    for (const course of MOCK_RECENT_COURSES) {
      expect(course.id).toBeTruthy();
      expect(course.title).toBeTruthy();
      expect(typeof course.progress).toBe('number');
      expect(course.progress).toBeGreaterThanOrEqual(0);
      expect(course.progress).toBeLessThanOrEqual(100);
    }
  });

  it('all course ids are unique', () => {
    const ids = MOCK_RECENT_COURSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('HomeScreen — formatRelativeTime', () => {
  it('returns empty string for empty input', () => {
    expect(formatRelativeTime('')).toBe('');
  });

  it('returns "Just now" for recent time (< 1 hour)', () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(recent)).toBe('Just now');
  });

  it('returns hours ago for same-day access', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('returns days ago for older access', () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns "1d ago" for exactly 24 hours ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');
  });
});

describe('HomeScreen — resolveStats: real stats take priority over mock', () => {
  const apiStats = {
    coursesEnrolled: 7,
    conceptsMastered: 99,
    totalLearningMinutes: 600,
  };

  it('uses real API stats when not loading and apiStats is present', () => {
    const result = resolveStats(false, apiStats, MOCK_STATS);
    expect(result.activeCourses).toBe(7);
    expect(result.conceptsMastered).toBe(99);
    expect(result.studyTimeMinutes).toBe(600);
  });

  it('real activeCourses (7) differs from mock (3)', () => {
    const result = resolveStats(false, apiStats, MOCK_STATS);
    expect(result.activeCourses).not.toBe(MOCK_STATS.activeCourses);
    expect(result.activeCourses).toBe(7);
  });

  it('falls back to MOCK_STATS when loading is true', () => {
    const result = resolveStats(true, apiStats, MOCK_STATS);
    expect(result).toBe(MOCK_STATS);
  });

  it('falls back to MOCK_STATS when apiStats is undefined', () => {
    const result = resolveStats(false, undefined, MOCK_STATS);
    expect(result).toBe(MOCK_STATS);
  });

  it('partial apiStats: missing conceptsMastered falls back to mock value', () => {
    const partial = { coursesEnrolled: 5, totalLearningMinutes: 120 };
    const result = resolveStats(false, partial, MOCK_STATS);
    expect(result.conceptsMastered).toBe(MOCK_STATS.conceptsMastered);
  });

  it('learningStreak always comes from MOCK_STATS (not in UserStats schema)', () => {
    const result = resolveStats(false, apiStats, MOCK_STATS);
    expect(result.learningStreak).toBe(MOCK_STATS.learningStreak);
  });

  it('MOCK_STATS is NOT used for activeCourses when real data is available', () => {
    const result = resolveStats(false, apiStats, MOCK_STATS);
    // Regression guard: the bad "always use MOCK_STATS" behavior is gone
    expect(result.activeCourses).not.toBe(MOCK_STATS.activeCourses);
  });
});
