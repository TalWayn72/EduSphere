import { gql } from 'graphql-tag';

export const MY_TENANT_LANGUAGE_SETTINGS_QUERY = gql`
  query MyTenantLanguageSettings {
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
