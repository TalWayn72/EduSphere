/**
 * OpenBadges 3.0 GraphQL queries and mutations (F-025)
 */
import { gql } from 'graphql-request';

export const MY_BADGES_QUERY = gql`
  query MyBadges {
    myBadges {
      id
      badgeDefinitionId
      badgeName
      badgeDescription
      recipientId
      issuedAt
      expiresAt
      evidenceUrl
      revoked
      verifyUrl
      shareUrl
    }
  }
`;

export const VERIFY_BADGE_QUERY = gql`
  query VerifyBadge($assertionId: ID!) {
    verifyBadge(assertionId: $assertionId) {
      valid
      error
      assertion {
        id
        badgeName
        badgeDescription
        recipientId
        issuedAt
        expiresAt
        revoked
        verifyUrl
      }
    }
  }
`;

export const BADGE_DEFINITIONS_QUERY = gql`
  query BadgeDefinitions {
    badgeDefinitions {
      id
      name
      description
      imageUrl
      criteriaUrl
      tags
      version
      issuerId
    }
  }
`;

export const CREATE_BADGE_DEFINITION_MUTATION = gql`
  mutation CreateBadgeDefinition(
    $name: String!
    $description: String!
    $imageUrl: String
    $criteriaUrl: String
    $tags: [String!]
  ) {
    createBadgeDefinition(
      name: $name
      description: $description
      imageUrl: $imageUrl
      criteriaUrl: $criteriaUrl
      tags: $tags
    ) {
      id
      name
      description
      tags
      version
    }
  }
`;

export const ISSUE_BADGE_MUTATION = gql`
  mutation IssueBadge(
    $userId: ID!
    $badgeDefinitionId: ID!
    $evidenceUrl: String
  ) {
    issueBadge(
      userId: $userId
      badgeDefinitionId: $badgeDefinitionId
      evidenceUrl: $evidenceUrl
    ) {
      id
      badgeName
      issuedAt
      verifyUrl
      shareUrl
    }
  }
`;

export const REVOKE_BADGE_MUTATION = gql`
  mutation RevokeBadge($assertionId: ID!, $reason: String!) {
    revokeBadge(assertionId: $assertionId, reason: $reason)
  }
`;
