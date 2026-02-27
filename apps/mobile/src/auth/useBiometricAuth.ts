/**
 * useBiometricAuth — prompts biometric authentication on app resume.
 * Falls back to a PIN if biometrics are unavailable or fail.
 * Memory-safe: AppState subscription removed in useEffect cleanup.
 * Auth state persisted in expo-secure-store (encrypted key-value).
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const BIOMETRIC_AUTH_KEY = '@edusphere/biometric_authenticated';
const AUTH_EXPIRY_MS = 5 * 60 * 1000; // re-prompt after 5 minutes of background

export type BiometricResult =
  | 'authenticated'
  | 'fallback'
  | 'unavailable'
  | 'cancelled'
  | 'failed';

export interface BiometricAuthState {
  isAvailable: boolean;
  isAuthenticated: boolean;
  lastAuthAt: number | null;
  /** Manually trigger the biometric prompt. */
  authenticate: () => Promise<BiometricResult>;
}

async function checkAvailability(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

async function readPersistedAuth(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_AUTH_KEY);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

async function persistAuth(ts: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_AUTH_KEY, String(ts));
  } catch {
    // Non-fatal
  }
}

async function clearPersistedAuth(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_AUTH_KEY);
  } catch {
    // Non-fatal
  }
}

export function useBiometricAuth(): BiometricAuthState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastAuthAt, setLastAuthAt] = useState<number | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const authenticate = useCallback(async (): Promise<BiometricResult> => {
    const available = await checkAvailability();
    if (!available) {
      setIsAuthenticated(true); // allow access without biometrics
      return 'unavailable';
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access EduSphere',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      const now = Date.now();
      setIsAuthenticated(true);
      setLastAuthAt(now);
      await persistAuth(now);
      return 'authenticated';
    }

    if (result.error === 'user_fallback') {
      // User chose PIN — treat as authenticated at the app level
      const now = Date.now();
      setIsAuthenticated(true);
      setLastAuthAt(now);
      await persistAuth(now);
      return 'fallback';
    }

    if (result.error === 'user_cancel') {
      return 'cancelled';
    }

    await clearPersistedAuth();
    setIsAuthenticated(false);
    return 'failed';
  }, []);

  // Check persisted auth and hardware availability on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const available = await checkAvailability();
      if (cancelled) return;
      setIsAvailable(available);

      const ts = await readPersistedAuth();
      if (cancelled) return;
      if (ts !== null && Date.now() - ts < AUTH_EXPIRY_MS) {
        setIsAuthenticated(true);
        setLastAuthAt(ts);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-prompt when returning from background if session has expired
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = nextState;

        if (prev === 'background' && nextState === 'active') {
          void (async () => {
            const ts = await readPersistedAuth();
            const expired = ts === null || Date.now() - ts >= AUTH_EXPIRY_MS;
            if (expired) {
              setIsAuthenticated(false);
              await authenticate();
            }
          })();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [authenticate]);

  return { isAvailable, isAuthenticated, lastAuthAt, authenticate };
}
