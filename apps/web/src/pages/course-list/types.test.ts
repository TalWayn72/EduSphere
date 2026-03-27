import { describe, it, expect } from 'vitest';
import type {
  CourseItem,
  UserEnrollment,
  CoursesQueryResult,
  MyEnrollmentsResult,
  SortOption,
  TabOption,
} from './types';

describe('course-list/types', () => {
  it('CourseItem shape is valid', () => {
    const item: CourseItem = {
      id: '1',
      title: 'Course',
      description: null,
      slug: 'course',
      thumbnailUrl: null,
      instructorId: 'i-1',
      isPublished: true,
      estimatedHours: null,
    };
    expect(item.slug).toBe('course');
  });

  it('UserEnrollment shape is valid', () => {
    const enrollment: UserEnrollment = {
      id: 'e-1',
      courseId: 'c-1',
      userId: 'u-1',
      status: 'ACTIVE',
      enrolledAt: '2026-01-01',
      completedAt: null,
    };
    expect(enrollment.completedAt).toBeNull();
  });

  it('CoursesQueryResult shape is valid', () => {
    const result: CoursesQueryResult = { courses: [] };
    expect(result.courses).toHaveLength(0);
  });

  it('MyEnrollmentsResult shape is valid', () => {
    const result: MyEnrollmentsResult = { myEnrollments: [] };
    expect(result.myEnrollments).toHaveLength(0);
  });

  it('SortOption accepts valid values', () => {
    const sorts: SortOption[] = ['newest', 'title', 'duration'];
    expect(sorts).toHaveLength(3);
  });

  it('TabOption accepts valid values', () => {
    const tabs: TabOption[] = ['all', 'enrolled'];
    expect(tabs).toHaveLength(2);
  });
});
