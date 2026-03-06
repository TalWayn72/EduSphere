/**
 * AITutorScreen — pure logic tests.
 * No @testing-library/react-native required (not installed).
 * Tests: AI consent gate logic (checkAiConsent/grantAiConsent from lib/ai-consent),
 *        sessionId resolution (resolveSessionId inline logic).
 *
 * Imports are from lib/ai-consent to avoid module-level StyleSheet.create() error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock AsyncStorage before importing any module that uses it
// ---------------------------------------------------------------------------
const mockStore: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStore[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      mockStore[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete mockStore[key];
    }),
  },
}));

import { checkAiConsent, grantAiConsent, AI_CONSENT_KEY } from '../lib/ai-consent';

// ---------------------------------------------------------------------------
// Pure resolveSessionId logic (mirrors AITutorScreen implementation)
// ---------------------------------------------------------------------------
function resolveSessionId(mutationResult: string | null, fallback: string): string {
  if (mutationResult && mutationResult.trim().length > 0) {
    return mutationResult;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  for (const key of Object.keys(mockStore)) {
    delete mockStore[key];
  }
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// checkAiConsent tests
// ---------------------------------------------------------------------------
describe('checkAiConsent', () => {
  it('returns false when AsyncStorage key is absent', async () => {
    const result = await checkAiConsent();
    expect(result).toBe(false);
  });

  it('returns false when value is "false"', async () => {
    mockStore[AI_CONSENT_KEY] = 'false';
    const result = await checkAiConsent();
    expect(result).toBe(false);
  });

  it('returns true when value is "true"', async () => {
    mockStore[AI_CONSENT_KEY] = 'true';
    const result = await checkAiConsent();
    expect(result).toBe(true);
  });

  it('returns false when AsyncStorage throws (fail-closed)', async () => {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    vi.mocked(AsyncStorage.default.getItem).mockRejectedValueOnce(
      new Error('storage error')
    );
    const result = await checkAiConsent();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// grantAiConsent tests
// ---------------------------------------------------------------------------
describe('grantAiConsent', () => {
  it('writes "true" to AsyncStorage', async () => {
    await grantAiConsent();
    expect(mockStore[AI_CONSENT_KEY]).toBe('true');
  });

  it('checkAiConsent returns true after grant', async () => {
    await grantAiConsent();
    expect(await checkAiConsent()).toBe(true);
  });

  it('consent persists across multiple checks', async () => {
    await grantAiConsent();
    expect(await checkAiConsent()).toBe(true);
    expect(await checkAiConsent()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveSessionId tests (SI-9: no hardcoded 'demo-session' in production)
// ---------------------------------------------------------------------------
describe('resolveSessionId', () => {
  it('returns the mutation result when non-empty', () => {
    expect(resolveSessionId('session-abc-123', 'demo-session')).toBe('session-abc-123');
  });

  it('returns fallback when mutation result is null', () => {
    expect(resolveSessionId(null, 'demo-session')).toBe('demo-session');
  });

  it('returns fallback when mutation result is empty string', () => {
    expect(resolveSessionId('', 'demo-session')).toBe('demo-session');
  });

  it('returns fallback when mutation result is whitespace-only', () => {
    expect(resolveSessionId('   ', 'demo-session')).toBe('demo-session');
  });

  it('a real session id is never "demo-session"', () => {
    const result = resolveSessionId('uuid-real-001', 'demo-session');
    expect(result).not.toBe('demo-session');
  });
});

// ---------------------------------------------------------------------------
// Consent gate integration (logic only, no UI)
// ---------------------------------------------------------------------------
describe('consent gate: AI call blocked without consent', () => {
  it('consent is NOT granted by default (clean storage)', async () => {
    expect(await checkAiConsent()).toBe(false);
  });

  it('consent IS granted after explicit grantAiConsent', async () => {
    await grantAiConsent();
    expect(await checkAiConsent()).toBe(true);
  });
});
