/**
 * BUG-098: Unit tests for source-manager utility functions.
 *
 * Tests hasValidAuth(), getSourceErrorKey(), getFriendlySourceErrorKey(),
 * authHeaders(), and parseSourceError() — all exported from utils.ts.
 *
 * These serve as regression guards for the BUG-098 fix: auth timeout
 * producing 400 Bad Request errors instead of a friendly i18n message.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @/lib/auth before importing utils (which imports getToken, isAuthenticated)
vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
  isAuthenticated: vi.fn(),
}));

import { getToken, isAuthenticated } from '@/lib/auth';
import {
  hasValidAuth,
  getSourceErrorKey,
  getFriendlySourceErrorKey,
  authHeaders,
  parseSourceError,
} from './utils';

// Note: vitest.config.ts defines import.meta.env.VITE_DEV_MODE = "true"
// so IS_DEV_MODE is always true in tests. hasValidAuth() returns true
// unconditionally in DEV_MODE. We test the non-DEV_MODE path by directly
// testing the underlying auth functions.

describe('utils — hasValidAuth()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true in DEV_MODE regardless of token state', () => {
    // In test env, VITE_DEV_MODE="true" → IS_DEV_MODE=true → always true
    vi.mocked(getToken).mockReturnValue(undefined);
    vi.mocked(isAuthenticated).mockReturnValue(false);
    expect(hasValidAuth()).toBe(true);
  });

  it('returns true in DEV_MODE even when auth functions return false', () => {
    vi.mocked(getToken).mockReturnValue(undefined);
    vi.mocked(isAuthenticated).mockReturnValue(false);
    // DEV_MODE short-circuits to true
    expect(hasValidAuth()).toBe(true);
  });
});

describe('utils — authHeaders()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Authorization header when token exists', () => {
    vi.mocked(getToken).mockReturnValue('mock-jwt-token');
    expect(authHeaders()).toEqual({ Authorization: 'Bearer mock-jwt-token' });
  });

  it('returns empty object when token is undefined', () => {
    vi.mocked(getToken).mockReturnValue(undefined);
    expect(authHeaders()).toEqual({});
  });

  it('returns empty object when token is empty string (falsy)', () => {
    vi.mocked(getToken).mockReturnValue('');
    expect(authHeaders()).toEqual({});
  });
});

describe('utils — getSourceErrorKey()', () => {
  // BUG-098 regression guards: these error strings must map to sources.errorUnauthorized

  it('returns sources.errorUnknown for null/undefined/falsy input', () => {
    expect(getSourceErrorKey(null)).toBe('sources.errorUnknown');
    expect(getSourceErrorKey(undefined)).toBe('sources.errorUnknown');
    expect(getSourceErrorKey('')).toBe('sources.errorUnknown');
    expect(getSourceErrorKey(0)).toBe('sources.errorUnknown');
  });

  it('maps "400 Bad Request" to sources.errorUnauthorized (BUG-098 core fix)', () => {
    expect(getSourceErrorKey(new Error('400 Bad Request'))).toBe(
      'sources.errorUnauthorized'
    );
  });

  it('maps "UNAUTHENTICATED" to sources.errorUnauthorized', () => {
    expect(getSourceErrorKey(new Error('UNAUTHENTICATED'))).toBe(
      'sources.errorUnauthorized'
    );
  });

  it('maps "Not authenticated" to sources.errorUnauthorized', () => {
    expect(
      getSourceErrorKey(new Error('Not authenticated — please log in'))
    ).toBe('sources.errorUnauthorized');
  });

  it('maps "Unauthorized" to sources.errorUnauthorized', () => {
    expect(getSourceErrorKey(new Error('Unauthorized'))).toBe(
      'sources.errorUnauthorized'
    );
  });

  it('maps "Auth required" to sources.errorUnauthorized', () => {
    expect(getSourceErrorKey(new Error('Auth required'))).toBe(
      'sources.errorUnauthorized'
    );
  });

  it('maps "DOWNSTREAM_SERVICE_ERROR" to sources.errorDownstream', () => {
    expect(
      getSourceErrorKey(new Error('DOWNSTREAM_SERVICE_ERROR: timeout'))
    ).toBe('sources.errorDownstream');
  });

  it('maps "Network" error to sources.errorNetwork', () => {
    expect(getSourceErrorKey(new Error('Network request failed'))).toBe(
      'sources.errorNetwork'
    );
  });

  it('maps "fetch" error to sources.errorNetwork', () => {
    expect(getSourceErrorKey(new Error('fetch failed'))).toBe(
      'sources.errorNetwork'
    );
  });

  it('returns sources.errorGeneric for unknown error strings', () => {
    expect(getSourceErrorKey(new Error('Something else went wrong'))).toBe(
      'sources.errorGeneric'
    );
  });

  it('handles non-Error values (strings, objects) by calling String()', () => {
    expect(getSourceErrorKey('400 Bad Request')).toBe(
      'sources.errorUnauthorized'
    );
    expect(getSourceErrorKey({ toString: () => 'Network failure' })).toBe(
      'sources.errorNetwork'
    );
  });
});

describe('utils — getFriendlySourceErrorKey()', () => {
  it('returns sources.errorGeneric for undefined/empty errorMessage', () => {
    expect(getFriendlySourceErrorKey(undefined)).toBe('sources.errorGeneric');
    expect(getFriendlySourceErrorKey('')).toBe('sources.errorGeneric');
  });

  it('maps "interrupted" to sources.errorServiceRestarted', () => {
    expect(getFriendlySourceErrorKey('Processing interrupted')).toBe(
      'sources.errorServiceRestarted'
    );
  });

  it('maps "service restarted" to sources.errorServiceRestarted', () => {
    expect(
      getFriendlySourceErrorKey('Pipeline failed: service restarted')
    ).toBe('sources.errorServiceRestarted');
  });

  it('maps "timeout" to sources.errorTimeout', () => {
    expect(getFriendlySourceErrorKey('Request timeout after 30s')).toBe(
      'sources.errorTimeout'
    );
  });

  it('maps "timed out" to sources.errorTimeout', () => {
    expect(getFriendlySourceErrorKey('Connection timed out')).toBe(
      'sources.errorTimeout'
    );
  });

  it('maps "too large" to sources.errorFileTooLarge', () => {
    expect(getFriendlySourceErrorKey('File too large (limit: 25MB)')).toBe(
      'sources.errorFileTooLarge'
    );
  });

  it('maps "size limit" to sources.errorFileTooLarge', () => {
    expect(getFriendlySourceErrorKey('Exceeded size limit')).toBe(
      'sources.errorFileTooLarge'
    );
  });

  it('returns sources.errorGeneric for unmatched error messages', () => {
    expect(getFriendlySourceErrorKey('Unknown pipeline failure')).toBe(
      'sources.errorGeneric'
    );
  });
});

describe('utils — parseSourceError() (deprecated)', () => {
  it('returns Hebrew fallback for null/undefined', () => {
    const result = parseSourceError(null);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns Hebrew auth error for "Unauthorized"', () => {
    const result = parseSourceError(new Error('Unauthorized'));
    expect(result).toContain(
      '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D4\u05E8\u05E9\u05D0\u05D4'
    );
  });

  it('returns Hebrew downstream error for "DOWNSTREAM_SERVICE_ERROR"', () => {
    const result = parseSourceError(new Error('DOWNSTREAM_SERVICE_ERROR'));
    expect(result).toContain(
      '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA'
    );
  });

  it('returns Hebrew network error for "Network" errors', () => {
    const result = parseSourceError(new Error('Network error'));
    expect(result).toContain(
      '\u05E9\u05D2\u05D9\u05D0\u05EA \u05E8\u05E9\u05EA'
    );
  });
});
