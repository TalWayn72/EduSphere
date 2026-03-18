import { gql } from 'urql';

export const UPDATE_CONSENT_MUTATION = gql`
  mutation UpdateConsent($input: UpdateConsentInput!) {
    updateConsent(input: $input)
  }
`;
