import { describe, it, expect } from 'vitest';
import { MOCK_LESSONS_FALLBACK, MOCK_COURSE_FALLBACK } from './mock-data';

describe('course-detail/mock-data', () => {
  it('MOCK_LESSONS_FALLBACK has lessons', () => {
    expect(MOCK_LESSONS_FALLBACK.length).toBeGreaterThan(0);
    for (const lesson of MOCK_LESSONS_FALLBACK) {
      expect(lesson.id).toBeTruthy();
      expect(lesson.title).toBeTruthy();
    }
  });

  it('MOCK_COURSE_FALLBACK has valid structure', () => {
    expect(MOCK_COURSE_FALLBACK.id).toBeTruthy();
    expect(MOCK_COURSE_FALLBACK.title).toBeTruthy();
    expect(MOCK_COURSE_FALLBACK.modules.length).toBeGreaterThan(0);
  });

  it('MOCK_COURSE_FALLBACK modules have content items', () => {
    const firstModule = MOCK_COURSE_FALLBACK.modules[0];
    expect(firstModule.contentItems.length).toBeGreaterThan(0);
    expect(firstModule.contentItems[0]).toHaveProperty('contentType');
  });
});
