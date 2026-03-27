import { describe, it, expect } from 'vitest';
import { INSTRUCTOR_ROLES, MOCK_COURSES_FALLBACK } from './constants';

describe('course-list/constants', () => {
  it('INSTRUCTOR_ROLES contains expected roles', () => {
    expect(INSTRUCTOR_ROLES.has('SUPER_ADMIN')).toBe(true);
    expect(INSTRUCTOR_ROLES.has('ORG_ADMIN')).toBe(true);
    expect(INSTRUCTOR_ROLES.has('INSTRUCTOR')).toBe(true);
    expect(INSTRUCTOR_ROLES.has('STUDENT')).toBe(false);
  });

  it('MOCK_COURSES_FALLBACK has courses', () => {
    expect(MOCK_COURSES_FALLBACK.length).toBeGreaterThan(0);
    for (const c of MOCK_COURSES_FALLBACK) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.slug).toBeTruthy();
    }
  });

  it('all fallback courses are published', () => {
    for (const c of MOCK_COURSES_FALLBACK) {
      expect(c.isPublished).toBe(true);
    }
  });
});
