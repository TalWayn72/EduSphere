// Shared types for the analytics feature

export interface ContentItemMetric {
  contentItemId: string;
  title: string;
  viewCount: number;
  avgTimeSpentSeconds: number;
  completionRate: number;
}

export interface FunnelStep {
  moduleId: string;
  moduleName: string;
  learnersStarted: number;
  learnersCompleted: number;
  dropOffRate: number;
}

export interface CourseAnalytics {
  courseId: string;
  enrollmentCount: number;
  activeLearnersLast7Days: number;
  completionRate: number;
  avgQuizScore: number | null;
  contentItemMetrics: ContentItemMetric[];
  dropOffFunnel: FunnelStep[];
}
