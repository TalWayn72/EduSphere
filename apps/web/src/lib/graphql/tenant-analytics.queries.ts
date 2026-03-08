import { gql } from 'urql';

export const TENANT_ANALYTICS_QUERY = gql`
  query TenantAnalytics($period: AnalyticsPeriod!) {
    tenantAnalytics(period: $period) {
      activeLearnersTrend { date value }
      completionRateTrend { date value }
      totalEnrollments
      avgLearningVelocity
      topCourses {
        courseId
        courseTitle
        enrollmentCount
        completionRate
        avgTimeToCompleteHours
      }
    }
  }
`;

export const LEARNER_VELOCITY_QUERY = gql`
  query LearnerVelocity($period: AnalyticsPeriod!, $limit: Int = 20) {
    learnerVelocity(period: $period, limit: $limit) {
      userId
      displayName
      lessonsPerWeek
      weeklyTrend { date value }
    }
  }
`;

export const COHORT_RETENTION_QUERY = gql`
  query CohortRetention($weeksBack: Int = 12) {
    cohortRetention(weeksBack: $weeksBack) {
      cohortWeek
      enrolled
      activeAt7Days
      activeAt30Days
      completionRate30Days
    }
  }
`;

export const EXPORT_TENANT_ANALYTICS_MUTATION = gql`
  mutation ExportTenantAnalytics($period: AnalyticsPeriod!, $format: ExportFormat!) {
    exportTenantAnalytics(period: $period, format: $format)
  }
`;
