export interface MeQueryResult {
  me: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    preferences: {
      locale: string;
      theme: string;
      emailNotifications: boolean;
      pushNotifications: boolean;
    } | null;
  } | null;
}

export interface CourseNode {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  estimatedHours: number | null;
}

export interface CoursesQueryResult {
  courses: CourseNode[];
}

export interface AnnotationNode {
  id: string;
}

export interface MyAnnotationsQueryResult {
  annotationsByUser: AnnotationNode[];
}

export interface MyStatsQueryResult {
  myStats: {
    coursesEnrolled: number;
    annotationsCreated: number;
    conceptsMastered: number;
    totalLearningMinutes: number;
    weeklyActivity: { date: string; count: number }[];
  };
}
