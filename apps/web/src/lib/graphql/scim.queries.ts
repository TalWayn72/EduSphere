import { gql } from "urql";

export const SCIM_TOKENS_QUERY = gql`
  query ScimTokens {
    scimTokens {
      id
      description
      lastUsedAt
      expiresAt
      isActive
      createdAt
    }
  }
`;

export const SCIM_SYNC_LOG_QUERY = gql`
  query ScimSyncLog($limit: Int) {
    scimSyncLog(limit: $limit) {
      id
      operation
      externalId
      status
      errorMessage
      createdAt
    }
  }
`;

export const GENERATE_SCIM_TOKEN_MUTATION = gql`
  mutation GenerateScimToken($input: GenerateScimTokenInput!) {
    generateScimToken(input: $input) {
      rawToken
      token {
        id
        description
        lastUsedAt
        expiresAt
        isActive
        createdAt
      }
    }
  }
`;

export const REVOKE_SCIM_TOKEN_MUTATION = gql`
  mutation RevokeScimToken($id: ID!) {
    revokeScimToken(id: $id)
  }
`;