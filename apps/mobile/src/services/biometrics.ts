import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricCapabilities {
  isAvailable: boolean;
  types: BiometricType[];
  isEnrolled: boolean;
}

export class BiometricService {
  async getCapabilities(): Promise<BiometricCapabilities> {
    const isAvailable = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    const types: BiometricType[] = supportedTypes.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'facial';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'none';
      }
    }).filter(t => t !== 'none');

    return { isAvailable, types, isEnrolled };
  }

  async authenticate(
    promptMessage: string = 'Authenticate to continue',
    fallbackLabel?: string
  ): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel,
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  async saveCredential(key: string, value: string): Promise<void> {
    const capabilities = await this.getCapabilities();

    if (capabilities.isAvailable && capabilities.isEnrolled) {
      const authenticated = await this.authenticate('Authenticate to save credentials');
      if (authenticated) {
        await SecureStore.setItemAsync(key, value, {
          requireAuthentication: true,
        });
      } else {
        throw new Error('Authentication failed');
      }
    } else {
      // Fallback to regular secure storage
      await SecureStore.setItemAsync(key, value);
    }
  }

  async getCredential(key: string, promptMessage?: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key, {
        requireAuthentication: true,
        authenticationPrompt: promptMessage || 'Authenticate to access credentials',
      });
      return value;
    } catch (error) {
      console.error('Failed to retrieve credential:', error);
      return null;
    }
  }

  async deleteCredential(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }

  async enableBiometricLogin(userId: string, token: string): Promise<boolean> {
    const capabilities = await this.getCapabilities();

    if (!capabilities.isAvailable || !capabilities.isEnrolled) {
      return false;
    }

    const authenticated = await this.authenticate('Enable biometric login');
    if (authenticated) {
      await this.saveCredential('userId', userId);
      await this.saveCredential('authToken', token);
      await SecureStore.setItemAsync('biometricEnabled', 'true');
      return true;
    }

    return false;
  }

  async disableBiometricLogin(): Promise<void> {
    await this.deleteCredential('userId');
    await this.deleteCredential('authToken');
    await SecureStore.deleteItemAsync('biometricEnabled');
  }

  async isBiometricLoginEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync('biometricEnabled');
    return enabled === 'true';
  }

  async biometricLogin(): Promise<{ userId: string; token: string } | null> {
    const isEnabled = await this.isBiometricLoginEnabled();
    if (!isEnabled) {
      return null;
    }

    const authenticated = await this.authenticate('Login with biometrics');
    if (!authenticated) {
      return null;
    }

    const userId = await this.getCredential('userId');
    const token = await this.getCredential('authToken');

    if (userId && token) {
      return { userId, token };
    }

    return null;
  }
}

export const biometricService = new BiometricService();
