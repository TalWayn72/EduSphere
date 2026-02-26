import { gql } from 'urql';

export const SECURITY_SETTINGS_QUERY = gql`
  query MySecuritySettings {
    mySecuritySettings {
      mfaRequired
      mfaRequiredForAdmins
      sessionTimeoutMinutes
      maxConcurrentSessions
      loginAttemptLockoutThreshold
      passwordMinLength
      passwordRequireSpecialChars
      passwordExpiryDays
      ipAllowlist
    }
  }
`;

export const UPDATE_SECURITY_SETTINGS_MUTATION = gql`
  mutation UpdateSecuritySettings($input: UpdateSecuritySettingsInput!) {
    updateSecuritySettings(input: $input) {
      mfaRequired
      mfaRequiredForAdmins
      sessionTimeoutMinutes
      maxConcurrentSessions
      loginAttemptLockoutThreshold
      passwordMinLength
      passwordRequireSpecialChars
      passwordExpiryDays
      ipAllowlist
    }
  }
`;
