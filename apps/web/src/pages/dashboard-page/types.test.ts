import { describe, it, expect } from 'vitest';
import type { MockCourse, MockActivity, MockMasteryItem } from './types';

describe('dashboard-page/types', () => {
  it('MockCourse shape is valid', () => {
    const course: MockCourse = {
      id: '1',
      title: 'Test',
      progress: 50,
      lastStudied: 'now',
      instructor: 'Dr. X',
    };
    expect(course.id).toBe('1');
    expect(course.progress).toBe(50);
  });

  it('MockActivity shape is valid', () => {
    const activity: MockActivity = {
      id: 'a-1',
      icon: 'study',
      action: 'Did something',
      timeAgo: '1h ago',
    };
    expect(activity.icon).toBe('study');
  });

  it('MockMasteryItem accepts all levels', () => {
    const levels: MockMasteryItem['level'][] = [
      'none',
      'attempted',
      'familiar',
      'proficient',
      'mastered',
    ];
    levels.forEach((level) => {
      const item: MockMasteryItem = { topic: 'Test', level };
      expect(item.level).toBe(level);
    });
  });
});
