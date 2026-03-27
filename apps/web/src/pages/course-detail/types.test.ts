import { describe, it, expect } from 'vitest';
import { EDITOR_ROLES } from './types';
import type {
  CourseDetailData,
  CourseDetailResult,
  ModuleSummary,
  ContentItemSummary,
  LessonSummary,
  EnrollmentData,
  ProgressData,
} from './types';

describe('course-detail/types', () => {
  it('EDITOR_ROLES contains expected roles', () => {
    expect(EDITOR_ROLES.has('SUPER_ADMIN')).toBe(true);
    expect(EDITOR_ROLES.has('ORG_ADMIN')).toBe(true);
    expect(EDITOR_ROLES.has('INSTRUCTOR')).toBe(true);
    expect(EDITOR_ROLES.has('STUDENT')).toBe(false);
  });

  it('ContentItemSummary shape is valid', () => {
    const item: ContentItemSummary = {
      id: '1',
      title: 'Test',
      contentType: 'VIDEO',
      duration: 600,
      orderIndex: 0,
    };
    expect(item.contentType).toBe('VIDEO');
  });

  it('ModuleSummary shape is valid', () => {
    const mod: ModuleSummary = {
      id: '1',
      title: 'Module 1',
      orderIndex: 0,
      contentItems: [],
    };
    expect(mod.contentItems).toHaveLength(0);
  });

  it('CourseDetailData shape is valid', () => {
    const data: CourseDetailData = {
      id: '1',
      title: 'Course',
      description: null,
      thumbnailUrl: null,
      estimatedHours: null,
      isPublished: true,
      instructorId: 'i-1',
      modules: [],
    };
    expect(data.isPublished).toBe(true);
  });

  it('CourseDetailResult allows null course', () => {
    const result: CourseDetailResult = { course: null };
    expect(result.course).toBeNull();
  });

  it('LessonSummary shape is valid', () => {
    const lesson: LessonSummary = {
      id: '1',
      title: 'Lesson',
      type: 'THEMATIC',
      status: 'PUBLISHED',
    };
    expect(lesson.type).toBe('THEMATIC');
  });

  it('EnrollmentData shape is valid', () => {
    const data: EnrollmentData = {
      myEnrollments: [{ courseId: 'c-1' }],
    };
    expect(data.myEnrollments).toHaveLength(1);
  });

  it('ProgressData shape is valid', () => {
    const data: ProgressData = {
      myCourseProgress: {
        totalItems: 10,
        completedItems: 5,
        percentComplete: 50,
      },
    };
    expect(data.myCourseProgress.percentComplete).toBe(50);
  });
});
