import { gql } from 'urql';

export const TENANT_LANGUAGE_SETTINGS_QUERY = gql`
  query TenantLanguageSettings {
    myTenantLanguageSettings {
      supportedLanguages
      defaultLanguage
    }
  }
`;

export const UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION = gql`
  mutation UpdateTenantLanguageSettings(
    $input: UpdateTenantLanguageSettingsInput!
  ) {
    updateTenantLanguageSettings(input: $input) {
      supportedLanguages
      defaultLanguage
    }
  }
`;
