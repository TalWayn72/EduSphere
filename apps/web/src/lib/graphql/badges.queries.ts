import { gql } from 'urql';

export const MY_OPEN_BADGES_QUERY = gql`
  query MyOpenBadges {
    myOpenBadges {
      id
      badgeDefinitionId
      badgeName
      badgeDescription
      imageUrl
      recipientId
      issuedAt
      expiresAt
      evidenceUrl
      revoked
      revokedAt
      revokedReason
      verifyUrl
      shareUrl
      vcDocument
    }
  }
`;
