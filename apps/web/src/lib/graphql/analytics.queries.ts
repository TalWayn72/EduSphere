import { gql } from 'urql';

// ── Instructor Analytics Overview ─────────────────────────────────────────────
// Aggregates analytics across all courses taught by the current instructor.
// Not yet in supergraph (tier-3); paused by default in production.

export const INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY = gql`
  query InstructorAnalyticsOverview {
    myCourses {
      id
      title
      courseAnalytics {
        courseId
        enrollmentCount
        completionRate
        avgQuizScore
        activeLearnersLast7Days
        dropOffFunnel {
          moduleId
          moduleName
          learnersStarted
          learnersCompleted
          dropOffRate
        }
      }
    }
  }
`;

// ── AI Usage per Course ───────────────────────────────────────────────────────
// AI agent interactions summary per course; not yet in supergraph.

export const INSTRUCTOR_AI_USAGE_QUERY = gql`
  query InstructorAiUsage {
    myCoursesAiUsage {
      courseId
      courseTitle
      totalAgentSessions
      avgSessionDurationSeconds
      topAgentTypes
    }
  }
`;
