import { gql } from 'urql';

export const MY_OPEN_BADGES_QUERY = gql`
  query MyOpenBadges {
    myOpenBadges {
      id
      badgeDefinitionId
      recipientId
      issuedAt
      expiresAt
      evidenceUrl
      revoked
      revokedAt
      revokedReason
      definition {
        id
        name
        description
        imageUrl
        criteriaUrl
        tags
        issuerId
        createdAt
      }
      vcDocument
    }
  }
`;

export const VERIFY_OPEN_BADGE_QUERY = gql`
  query VerifyOpenBadge($assertionId: ID!) {
    verifyOpenBadge(assertionId: $assertionId)
  }
`;
