import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'edusphere_auth_token';
const REFRESH_KEY = 'edusphere_refresh_token';

export async function storeTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

/** Decode a base64url-encoded JWT segment (React Native / Hermes compatible). */
function decodeBase64(input: string): string {
  // Hermes exposes atob as a global but TypeScript's react-native types do not
  // declare it. Cast through globalThis to satisfy the type checker.
  const atobFn = (globalThis as Record<string, unknown>)['atob'] as (
    s: string
  ) => string;
  // Normalise base64url to standard base64
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  return atobFn(base64);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  // Check if token is expired by decoding JWT payload
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return false;
    const decoded = JSON.parse(decodeBase64(parts[1])) as { exp: number };
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
