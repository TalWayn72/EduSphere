export const ACTIVE_CHALLENGES_QUERY = `query ActiveChallenges($courseId: String) {
  activeChallenges(courseId: $courseId) {
    edges { node { id title description challengeType targetScore startDate endDate maxParticipants status participantCount createdBy } }
    totalCount
  }
}`;

export const MY_PARTICIPATIONS_QUERY = `query MyChallengeParticipations {
  myChallengePariticipations { id challengeId userId score rank joinedAt completedAt }
}`;

export const CHALLENGE_LEADERBOARD_QUERY = `query ChallengeLeaderboard($challengeId: ID!) {
  challengeLeaderboard(challengeId: $challengeId) { id userId score rank joinedAt completedAt }
}`;

export const JOIN_CHALLENGE_MUTATION = `mutation JoinChallenge($challengeId: ID!) {
  joinChallenge(challengeId: $challengeId) { id challengeId userId score rank joinedAt }
}`;

export const SUBMIT_SCORE_MUTATION = `mutation SubmitChallengeScore($challengeId: ID!, $score: Int!) {
  submitChallengeScore(challengeId: $challengeId, score: $score) { id score rank }
}`;
