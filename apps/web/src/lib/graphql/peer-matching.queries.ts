export const PEER_MATCHES_QUERY = `query PeerMatches($courseId: String) {
  peerMatches(courseId: $courseId) { userId matchReason complementarySkills sharedCourseCount }
}`;

export const MY_MATCH_REQUESTS_QUERY = `query MyPeerMatchRequests {
  myPeerMatchRequests { id requesterId matchedUserId courseId matchReason status createdAt }
}`;

export const REQUEST_PEER_MATCH_MUTATION = `mutation RequestPeerMatch($matchedUserId: ID!, $courseId: String) {
  requestPeerMatch(matchedUserId: $matchedUserId, courseId: $courseId) { id status }
}`;

export const RESPOND_PEER_MATCH_MUTATION = `mutation RespondToPeerMatch($requestId: ID!, $accept: Boolean!) {
  respondToPeerMatch(requestId: $requestId, accept: $accept) { id status }
}`;
