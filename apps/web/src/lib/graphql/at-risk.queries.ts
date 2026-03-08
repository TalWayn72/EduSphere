import { gql } from 'urql';

export const LIST_AT_RISK_LEARNERS_QUERY = gql`
  query ListAtRiskLearners($threshold: Int) {
    listAtRiskLearners(threshold: $threshold) {
      userId
      displayName
      courseId
      courseTitle
      daysSinceActive
      progressPct
    }
  }
`;
