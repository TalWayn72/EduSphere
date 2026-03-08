import { gql } from 'urql';

export const MY_TEAM_OVERVIEW_QUERY = gql`
  query MyTeamOverview {
    myTeamOverview {
      memberCount
      avgCompletionPct
      avgXpThisWeek
      atRiskCount
      topCourseTitle
    }
    myTeamMemberProgress {
      userId
      displayName
      coursesEnrolled
      avgCompletionPct
      totalXp
      level
      lastActiveAt
      isAtRisk
    }
  }
`;

export const ADD_TEAM_MEMBER_MUTATION = gql`
  mutation AddTeamMember($memberId: ID!) {
    addTeamMember(memberId: $memberId)
  }
`;

export const REMOVE_TEAM_MEMBER_MUTATION = gql`
  mutation RemoveTeamMember($memberId: ID!) {
    removeTeamMember(memberId: $memberId)
  }
`;
