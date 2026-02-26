import { gql } from 'urql';

export const BI_API_TOKENS_QUERY = gql`
  query BiApiTokens {
    biApiTokens {
      id
      description
      isActive
      createdAt
      lastUsedAt
    }
  }
`;

export const GENERATE_BI_API_KEY_MUTATION = gql`
  mutation GenerateBIApiKey($description: String!) {
    generateBIApiKey(description: $description)
  }
`;

export const REVOKE_BI_API_KEY_MUTATION = gql`
  mutation RevokeBIApiKey($tokenId: ID!) {
    revokeBIApiKey(tokenId: $tokenId)
  }
`;
