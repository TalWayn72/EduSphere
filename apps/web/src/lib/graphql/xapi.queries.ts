import { gql } from 'urql';

export const XAPI_TOKENS_QUERY = gql`
  query XapiTokens {
    xapiTokens {
      id
      description
      lrsEndpoint
      isActive
      createdAt
    }
  }
`;

export const XAPI_STATEMENTS_QUERY = gql`
  query XapiStatements($limit: Int, $since: String) {
    xapiStatements(limit: $limit, since: $since) {
      id
      verb
      objectId
      storedAt
    }
  }
`;

export const GENERATE_XAPI_TOKEN_MUTATION = gql`
  mutation GenerateXapiToken($description: String!, $lrsEndpoint: String) {
    generateXapiToken(description: $description, lrsEndpoint: $lrsEndpoint)
  }
`;

export const REVOKE_XAPI_TOKEN_MUTATION = gql`
  mutation RevokeXapiToken($tokenId: ID!) {
    revokeXapiToken(tokenId: $tokenId)
  }
`;
