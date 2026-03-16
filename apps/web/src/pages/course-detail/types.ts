/**
 * Shared types and constants for CourseDetailPage.
 */

export const EDITOR_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);

export interface ContentItemSummary {
  id: string;
  title: string;
  contentType: string;
  duration: number | null;
  orderIndex: number;
}

export interface ModuleSummary {
  id: string;
  title: string;
  orderIndex: number;
  contentItems: ContentItemSummary[];
}

export interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  isPublished: boolean;
  instructorId: string;
  modules: ModuleSummary[];
}

export interface CourseDetailResult {
  course: CourseDetailData | null;
}

export interface LessonSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  series?: string;
}

export interface LessonsByCourseData {
  lessonsByCourse: LessonSummary[];
}

export interface EnrollmentData {
  myEnrollments: Array<{ courseId: string }>;
}

export interface ProgressData {
  myCourseProgress: {
    totalItems: number;
    completedItems: number;
    percentComplete: number;
  };
}
