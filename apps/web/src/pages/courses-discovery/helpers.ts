import type { ApiCourse, CourseLevel, DisplayCourse } from './types';

/** Map an API course to a display course for CourseCard rendering. */
export function toDisplayCourse(course: ApiCourse): DisplayCourse {
  // Derive level heuristic from estimatedHours (no level field in SDL)
  let level: CourseLevel = 'Beginner';
  if ((course.estimatedHours ?? 0) > 10) level = 'Advanced';
  else if ((course.estimatedHours ?? 0) > 4) level = 'Intermediate';

  return {
    id: course.id,
    title: course.title,
    instructor: `Instructor ${course.instructorId.slice(0, 6)}`,
    category: 'General',
    lessonCount: 0,
    estimatedHours: course.estimatedHours ?? 0,
    enrolled: false,
    mastery: 'none',
    featured: false,
    level,
  };
}
