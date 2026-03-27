import { describe, it, expect } from 'vitest';
import {
  CATEGORY_FILTERS,
  LEVEL_FILTERS,
  SORT_OPTIONS,
  DURATION_FILTERS,
  PAGE_SIZE,
} from './types';
import type { ApiCourse, CourseLevel, SortOption } from './types';

describe('courses-discovery/types', () => {
  it('CATEGORY_FILTERS is non-empty and starts with All', () => {
    expect(CATEGORY_FILTERS.length).toBeGreaterThan(0);
    expect(CATEGORY_FILTERS[0]).toBe('All');
  });

  it('LEVEL_FILTERS starts with Any Level', () => {
    expect(LEVEL_FILTERS[0]).toBe('Any Level');
    expect(LEVEL_FILTERS).toContain('Beginner');
    expect(LEVEL_FILTERS).toContain('Advanced');
  });

  it('SORT_OPTIONS has value/label pairs', () => {
    expect(SORT_OPTIONS.length).toBeGreaterThan(0);
    for (const opt of SORT_OPTIONS) {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
    }
  });

  it('DURATION_FILTERS is non-empty', () => {
    expect(DURATION_FILTERS.length).toBeGreaterThan(0);
    expect(DURATION_FILTERS[0]).toBe('Any Duration');
  });

  it('PAGE_SIZE is a positive number', () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });

  it('ApiCourse shape is valid', () => {
    const course: ApiCourse = {
      id: '1',
      title: 'Test',
      isPublished: true,
      instructorId: 'i-1',
      slug: 'test',
      createdAt: '2026-01-01',
    };
    expect(course.slug).toBe('test');
  });

  it('CourseLevel accepts valid values', () => {
    const levels: CourseLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
    expect(levels).toHaveLength(3);
  });

  it('SortOption accepts valid values', () => {
    const sorts: SortOption[] = ['popular', 'newest', 'rating'];
    expect(sorts).toHaveLength(3);
  });
});
