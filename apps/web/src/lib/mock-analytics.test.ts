import { describe, it, expect } from 'vitest';
import {
  MOCK_HEATMAP_DATA,
  MOCK_COURSE_PROGRESS,
  MOCK_WEEKLY_STATS,
  MOCK_ACTIVITY_FEED,
  MOCK_LEARNING_STREAK,
  MOCK_TOTAL_STUDY_MINUTES,
  MOCK_CONCEPTS_MASTERED,
} from './mock-analytics';

describe('MOCK_HEATMAP_DATA', () => {
  it('contains 84 days of data (12 weeks)', () => {
    expect(MOCK_HEATMAP_DATA.length).toBe(84);
  });

  it('each entry has a date string and count', () => {
    MOCK_HEATMAP_DATA.forEach((day) => {
      expect(typeof day.date).toBe('string');
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof day.count).toBe('number');
    });
  });

  it('all counts are non-negative', () => {
    MOCK_HEATMAP_DATA.forEach((day) => {
      expect(day.count).toBeGreaterThanOrEqual(0);
    });
  });

  it('dates are in ascending order', () => {
    for (let i = 1; i < MOCK_HEATMAP_DATA.length; i++) {
      const prev = MOCK_HEATMAP_DATA[i - 1]!.date ?? '';
      const curr = MOCK_HEATMAP_DATA[i]!.date ?? '';
      expect(curr >= prev).toBe(true);
    }
  });
});

describe('MOCK_COURSE_PROGRESS', () => {
  it('has at least one course', () => {
    expect(MOCK_COURSE_PROGRESS.length).toBeGreaterThan(0);
  });

  it('each course has required fields with valid values', () => {
    MOCK_COURSE_PROGRESS.forEach((course) => {
      expect(typeof course.id).toBe('string');
      expect(typeof course.title).toBe('string');
      expect(course.progress).toBeGreaterThanOrEqual(0);
      expect(course.progress).toBeLessThanOrEqual(100);
      expect(course.totalMinutes).toBeGreaterThan(0);
    });
  });
});

describe('MOCK_WEEKLY_STATS', () => {
  it('has at least one week of stats', () => {
    expect(MOCK_WEEKLY_STATS.length).toBeGreaterThan(0);
  });

  it('each week has non-negative numeric stats', () => {
    MOCK_WEEKLY_STATS.forEach((week) => {
      expect(typeof week.week).toBe('string');
      expect(week.studyMinutes).toBeGreaterThanOrEqual(0);
      expect(week.quizzesTaken).toBeGreaterThanOrEqual(0);
      expect(week.annotationsAdded).toBeGreaterThanOrEqual(0);
      expect(week.aiSessions).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('MOCK_ACTIVITY_FEED', () => {
  const validTypes = ['study', 'quiz', 'annotation', 'ai_session', 'discussion'];

  it('has at least one activity item', () => {
    expect(MOCK_ACTIVITY_FEED.length).toBeGreaterThan(0);
  });

  it('each item has required fields', () => {
    MOCK_ACTIVITY_FEED.forEach((item) => {
      expect(typeof item.id).toBe('string');
      expect(validTypes).toContain(item.type);
      expect(typeof item.title).toBe('string');
      expect(typeof item.description).toBe('string');
      expect(typeof item.timestamp).toBe('string');
    });
  });

  it('timestamp strings are valid ISO dates', () => {
    MOCK_ACTIVITY_FEED.forEach((item) => {
      const date = new Date(item.timestamp);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });
});

describe('Scalar mock constants', () => {
  it('MOCK_LEARNING_STREAK is a positive integer', () => {
    expect(Number.isInteger(MOCK_LEARNING_STREAK)).toBe(true);
    expect(MOCK_LEARNING_STREAK).toBeGreaterThan(0);
  });

  it('MOCK_TOTAL_STUDY_MINUTES is positive', () => {
    expect(MOCK_TOTAL_STUDY_MINUTES).toBeGreaterThan(0);
  });

  it('MOCK_CONCEPTS_MASTERED is non-negative', () => {
    expect(MOCK_CONCEPTS_MASTERED).toBeGreaterThanOrEqual(0);
  });
});
