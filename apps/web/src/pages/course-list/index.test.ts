import { describe, it, expect } from 'vitest';

describe('course-list/index barrel', () => {
  it('re-exports CourseList', async () => {
    const mod = await import('./index');
    expect(mod.CourseList).toBeDefined();
  });

  it('re-exports INSTRUCTOR_ROLES', async () => {
    const mod = await import('./index');
    expect(mod.INSTRUCTOR_ROLES).toBeDefined();
  });

  it('re-exports MOCK_COURSES_FALLBACK', async () => {
    const mod = await import('./index');
    expect(mod.MOCK_COURSES_FALLBACK).toBeDefined();
  });
});
