export const COHORT_INSIGHTS_QUERY = `
  query CohortInsights($conceptId: ID!, $courseId: ID!) {
    cohortInsights(conceptId: $conceptId, courseId: $courseId) {
      conceptId
      totalPastDiscussions
      insights {
        annotationId
        content
        authorCohortLabel
        relevanceScore
      }
    }
  }
`;
