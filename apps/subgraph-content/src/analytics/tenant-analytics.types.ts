// Types for tenant-level analytics

export interface DailyMetric {
  date: string; // ISO date string
  value: number;
}

export interface TopCourse {
  courseId: string;
  title: string;
  enrollmentCount: number;
  completionRate: number;
}

export interface TenantAnalyticsDto {
  tenantId: string;
  period: string;
  totalEnrollments: number;
  avgLearningVelocity: number;
  activeLearnersTrend: DailyMetric[];
  completionRateTrend: DailyMetric[];
  topCourses: TopCourse[];
}

export interface LearnerVelocityDto {
  userId: string;
  displayName: string;
  avgLessonsPerWeek: number;
  totalWeeks: number;
}

export interface CohortMetricsDto {
  cohortWeek: string; // ISO week string e.g. "2025-W12"
  enrolled: number;
  activeAt7Days: number;
  activeAt30Days: number;
  retentionAt7Days: number; // percentage 0-100
  retentionAt30Days: number; // percentage 0-100
}

export type AnalyticsPeriod = 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'NINETY_DAYS';
