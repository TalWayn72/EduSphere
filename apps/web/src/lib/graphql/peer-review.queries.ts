import { gql } from '@urql/core';

export const MY_REVIEW_ASSIGNMENTS_QUERY = gql`
  query MyReviewAssignments {
    myReviewAssignments {
      id
      contentItemId
      contentItemTitle
      submitterId
      submitterDisplayName
      status
      submissionText
      createdAt
    }
  }
`;

export const MY_SUBMISSIONS_QUERY = gql`
  query MySubmissions {
    mySubmissions {
      id
      contentItemId
      contentItemTitle
      status
      score
      feedback
      createdAt
    }
  }
`;

export const PEER_REVIEW_RUBRIC_QUERY = gql`
  query PeerReviewRubric($contentItemId: ID!) {
    peerReviewRubric(contentItemId: $contentItemId) {
      id
      criteria
      minReviewers
      isAnonymous
    }
  }
`;

export const SUBMIT_PEER_REVIEW_MUTATION = gql`
  mutation SubmitPeerReview($assignmentId: ID!, $criteriaScores: String!, $feedback: String) {
    submitPeerReview(assignmentId: $assignmentId, criteriaScores: $criteriaScores, feedback: $feedback)
  }
`;
