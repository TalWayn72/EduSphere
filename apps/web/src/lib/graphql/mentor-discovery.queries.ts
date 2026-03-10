export const MENTORS_BY_PATH_QUERY = `
  query MentorsByPathTopology($courseId: ID!) {
    mentorsByPathTopology(courseId: $courseId) {
      mentorId
      pathOverlapScore
      sharedConcepts
    }
  }
`;

export const REQUEST_MENTOR_MATCH_MUTATION = `
  mutation RequestPeerMatch($matchedUserId: ID!, $courseId: ID!) {
    requestPeerMatch(matchedUserId: $matchedUserId, courseId: $courseId) {
      id
      status
    }
  }
`;
