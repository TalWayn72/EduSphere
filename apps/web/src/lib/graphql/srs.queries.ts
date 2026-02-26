import { gql } from 'urql';

const SRS_CARD_FRAGMENT = gql`
  fragment SRSCardFields on SRSCard {
    id
    conceptName
    dueDate
    intervalDays
    easeFactor
    repetitions
    lastReviewedAt
  }
`;

export const DUE_REVIEWS_QUERY = gql`
  ${SRS_CARD_FRAGMENT}
  query DueReviews($limit: Int) {
    dueReviews(limit: $limit) {
      ...SRSCardFields
    }
  }
`;

export const SRS_QUEUE_COUNT_QUERY = gql`
  query SrsQueueCount {
    srsQueueCount
  }
`;

export const SUBMIT_REVIEW_MUTATION = gql`
  ${SRS_CARD_FRAGMENT}
  mutation SubmitReview($cardId: ID!, $quality: Int!) {
    submitReview(cardId: $cardId, quality: $quality) {
      ...SRSCardFields
    }
  }
`;

export const CREATE_REVIEW_CARD_MUTATION = gql`
  ${SRS_CARD_FRAGMENT}
  mutation CreateReviewCard($conceptName: String!) {
    createReviewCard(conceptName: $conceptName) {
      ...SRSCardFields
    }
  }
`;
