import { describe, it, expect } from 'vitest';
import { scoreCoursesForUser } from './recommendation-scorer';
import type { CourseCandidate, ScoringSignals } from './recommendation-scorer';

const now = new Date();
const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
const oldDate = new Date('2020-01-01');

const baseCandidates: CourseCandidate[] = [
  {
    courseId: 'c1',
    title: 'GraphQL Basics',
    instructorName: 'Alice',
    tags: ['graphql', 'api'],
    enrollmentCount: 100,
    addedAt: recentDate,
  },
  {
    courseId: 'c2',
    title: 'React Advanced',
    instructorName: 'Bob',
    tags: ['react', 'hooks'],
    enrollmentCount: 50,
    addedAt: oldDate,
  },
  {
    courseId: 'c3',
    title: 'PostgreSQL',
    instructorName: 'Carol',
    tags: ['postgres', 'sql'],
    enrollmentCount: 200,
    addedAt: now,
  },
];

const emptySignals: ScoringSignals = {
  skillGaps: [],
  learningVelocity: { lessonsPerWeek: 0 },
  enrolledCourseIds: new Set<string>(),
  tenantTopCourses: [],
};

describe('scoreCoursesForUser', () => {
  it('returns empty array for empty candidates', () => {
    expect(scoreCoursesForUser([], emptySignals)).toEqual([]);
  });

  it('scores gap-matched course higher than non-gap course', () => {
    const signals: ScoringSignals = {
      ...emptySignals,
      skillGaps: [{ conceptName: 'GraphQL', level: 'NONE' }],
    };
    const results = scoreCoursesForUser(baseCandidates, signals);
    expect(results[0].courseId).toBe('c1'); // graphql tag matches gap
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('excludes already-enrolled courses', () => {
    const signals: ScoringSignals = {
      ...emptySignals,
      enrolledCourseIds: new Set(['c1', 'c3']),
    };
    const results = scoreCoursesForUser(baseCandidates, signals);
    const ids = results.map((r) => r.courseId);
    expect(ids).not.toContain('c1');
    expect(ids).not.toContain('c3');
    expect(results).toHaveLength(1);
    expect(results[0].courseId).toBe('c2');
  });

  it('assigns gap-based reason when gap match exists', () => {
    // c3 has tags ['postgres', 'sql'] — conceptName must match one of those (case-insensitive)
    const signals: ScoringSignals = {
      ...emptySignals,
      skillGaps: [{ conceptName: 'postgres', level: 'ATTEMPTED' }],
    };
    const results = scoreCoursesForUser(baseCandidates, signals);
    const pg = results.find((r) => r.courseId === 'c3');
    expect(pg?.reason).toContain('postgres');
  });

  it('assigns freshness reason for newly added course with no gap match', () => {
    // Use a course added very recently with no gap overlap
    const freshOnly: CourseCandidate[] = [
      { courseId: 'cf', title: 'New Course', instructorName: 'Dave', tags: ['xyz'], enrollmentCount: 1, addedAt: now },
    ];
    const results = scoreCoursesForUser(freshOnly, emptySignals);
    expect(results[0].reason).toMatch(/new/i);
  });

  it('assigns trending reason when no gap match and no freshness', () => {
    const oldCandidates: CourseCandidate[] = [
      { courseId: 'co', title: 'Old Course', instructorName: 'Eve', tags: ['legacy'], enrollmentCount: 500, addedAt: oldDate },
    ];
    const results = scoreCoursesForUser(oldCandidates, emptySignals);
    expect(results[0].reason).toMatch(/trending/i);
  });

  it('higher velocity produces higher scores (all else equal)', () => {
    const candidate: CourseCandidate[] = [
      { courseId: 'cv', title: 'Velocity Course', instructorName: 'F', tags: [], enrollmentCount: 10, addedAt: oldDate },
    ];
    const lowVelocity = scoreCoursesForUser(candidate, { ...emptySignals, learningVelocity: { lessonsPerWeek: 0 } });
    const highVelocity = scoreCoursesForUser(candidate, { ...emptySignals, learningVelocity: { lessonsPerWeek: 10 } });
    expect(highVelocity[0].score).toBeGreaterThan(lowVelocity[0].score);
  });

  it('velocity boost is capped at 0.1', () => {
    const candidate: CourseCandidate[] = [
      { courseId: 'cv2', title: 'Cap Course', instructorName: 'G', tags: [], enrollmentCount: 0, addedAt: oldDate },
    ];
    const veryHighVelocity = scoreCoursesForUser(candidate, { ...emptySignals, learningVelocity: { lessonsPerWeek: 100 } });
    const normalHighVelocity = scoreCoursesForUser(candidate, { ...emptySignals, learningVelocity: { lessonsPerWeek: 10 } });
    // Both should be same score (capped at 0.1)
    expect(veryHighVelocity[0].score).toBe(normalHighVelocity[0].score);
  });

  it('sorts results by score descending', () => {
    const signals: ScoringSignals = {
      ...emptySignals,
      skillGaps: [{ conceptName: 'GraphQL', level: 'NONE' }],
    };
    const results = scoreCoursesForUser(baseCandidates, signals);
    for (let i = 0; i < results.length - 1; i++) {
      // eslint-disable-next-line security/detect-object-injection
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  it('handles case-insensitive tag matching', () => {
    const candidates: CourseCandidate[] = [
      { courseId: 'ci1', title: 'Mixed Case', instructorName: 'H', tags: ['GraphQL', 'REST'], enrollmentCount: 10, addedAt: oldDate },
    ];
    const signals: ScoringSignals = {
      ...emptySignals,
      skillGaps: [{ conceptName: 'graphql', level: 'NONE' }],
    };
    const results = scoreCoursesForUser(candidates, signals);
    expect(results[0].reason).toMatch(/graphql/i);
  });

  it('returns all candidates minus enrolled ones', () => {
    const results = scoreCoursesForUser(baseCandidates, emptySignals);
    expect(results).toHaveLength(baseCandidates.length);
  });
});
