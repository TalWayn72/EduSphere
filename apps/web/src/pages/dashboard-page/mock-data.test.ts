import { describe, it, expect } from 'vitest';
import {
  MOCK_IN_PROGRESS,
  MOCK_RECOMMENDED,
  MOCK_ACTIVITY,
  MOCK_MASTERY,
  MOCK_STREAK,
  MOCK_COMPLETED,
} from './mock-data';

describe('dashboard-page/mock-data', () => {
  it('MOCK_IN_PROGRESS has courses with valid shape', () => {
    expect(MOCK_IN_PROGRESS.length).toBeGreaterThan(0);
    for (const c of MOCK_IN_PROGRESS) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(typeof c.progress).toBe('number');
    }
  });

  it('MOCK_RECOMMENDED has courses', () => {
    expect(MOCK_RECOMMENDED.length).toBeGreaterThan(0);
    expect(MOCK_RECOMMENDED[0].progress).toBe(0);
  });

  it('MOCK_ACTIVITY is non-empty', () => {
    expect(MOCK_ACTIVITY.length).toBeGreaterThan(0);
    expect(MOCK_ACTIVITY[0]).toHaveProperty('icon');
    expect(MOCK_ACTIVITY[0]).toHaveProperty('action');
  });

  it('MOCK_MASTERY covers all levels', () => {
    const levels = MOCK_MASTERY.map((m) => m.level);
    expect(levels).toContain('mastered');
    expect(levels).toContain('none');
  });

  it('MOCK_STREAK is a positive number', () => {
    expect(MOCK_STREAK).toBeGreaterThan(0);
  });

  it('MOCK_COMPLETED is a positive number', () => {
    expect(MOCK_COMPLETED).toBeGreaterThan(0);
  });
});
