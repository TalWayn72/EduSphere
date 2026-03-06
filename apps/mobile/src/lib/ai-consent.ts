/**
 * ai-consent — AsyncStorage helpers for SI-10 AI consent gate.
 * Pure logic, no React Native UI — importable in tests without StyleSheet/etc.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AI_CONSENT_KEY = 'ai_consent_given';

/**
 * Check whether the user has granted AI consent.
 * Returns false on any AsyncStorage error (fail-closed).
 */
export async function checkAiConsent(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(AI_CONSENT_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist AI consent grant in AsyncStorage.
 */
export async function grantAiConsent(): Promise<void> {
  await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
}
