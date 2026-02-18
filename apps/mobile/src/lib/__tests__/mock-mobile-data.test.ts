import {
  MOCK_USER,
  MOCK_STATS,
  MOCK_RECENT_COURSES,
  MOCK_GRAPH_NODES,
  MOCK_DISCUSSIONS,
} from '../mock-mobile-data';

describe('mock-mobile-data', () => {
  it('MOCK_USER has required fields', () => {
    expect(MOCK_USER.id).toBeTruthy();
    expect(MOCK_USER.email).toMatch(/@/);
    expect(MOCK_USER.firstName).toBeTruthy();
    expect(MOCK_USER.role).toBe('STUDENT');
  });

  it('MOCK_STATS has positive numbers', () => {
    expect(MOCK_STATS.activeCourses).toBeGreaterThan(0);
    expect(MOCK_STATS.learningStreak).toBeGreaterThan(0);
    expect(MOCK_STATS.studyTimeMinutes).toBeGreaterThan(0);
    expect(MOCK_STATS.conceptsMastered).toBeGreaterThan(0);
  });

  it('MOCK_RECENT_COURSES has at least 3 items with progress 0-100', () => {
    expect(MOCK_RECENT_COURSES.length).toBeGreaterThanOrEqual(3);
    MOCK_RECENT_COURSES.forEach((course) => {
      expect(course.progress).toBeGreaterThanOrEqual(0);
      expect(course.progress).toBeLessThanOrEqual(100);
      expect(course.id).toBeTruthy();
      expect(course.title).toBeTruthy();
    });
  });

  it('MOCK_GRAPH_NODES covers all 4 types', () => {
    const types = new Set(MOCK_GRAPH_NODES.map((n) => n.type));
    expect(types.has('CONCEPT')).toBe(true);
    expect(types.has('PERSON')).toBe(true);
    expect(types.has('SOURCE')).toBe(true);
    expect(types.has('TERM')).toBe(true);
  });

  it('MOCK_DISCUSSIONS have upvotes >= 0', () => {
    MOCK_DISCUSSIONS.forEach((d) => {
      expect(d.upvotes).toBeGreaterThanOrEqual(0);
      expect(d.title).toBeTruthy();
      expect(d.content).toBeTruthy();
    });
  });
});
