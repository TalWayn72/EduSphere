export interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  thumbnailUrl: string | null;
  instructorId: string;
  isPublished: boolean;
  estimatedHours: number | null;
}

export interface UserEnrollment {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
}

export interface CoursesQueryResult {
  courses: CourseItem[];
}

export interface MyEnrollmentsResult {
  myEnrollments: UserEnrollment[];
}

export type SortOption = 'newest' | 'title' | 'duration';
export type TabOption = 'all' | 'enrolled';
