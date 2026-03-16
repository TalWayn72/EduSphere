/**
 * Utility / helper functions for SourceManager.
 * Auth header builder + error parsers.
 */

import { getToken } from '@/lib/auth';

// ─── DEV_MODE flag ────────────────────────────────────────────────────────────

export const IS_DEV_MODE =
  import.meta.env.VITE_DEV_MODE === 'true' ||
  !import.meta.env.VITE_KEYCLOAK_URL;

/** Returns Authorization header for authenticated gqlClient requests. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Error parsers (exported for unit testing) ────────────────────────────────

/**
 * Extracts an i18n key for a GraphQL or network error from SourceManager.
 * Call with t('sources.<key>') using the 'content' namespace in the component.
 */
export function getSourceErrorKey(e: unknown): string {
  if (!e) return 'sources.errorUnknown';
  const msg = String(e);
  if (msg.includes('Unauthorized') || msg.includes('Auth required')) {
    return 'sources.errorUnauthorized';
  }
  if (msg.includes('DOWNSTREAM_SERVICE_ERROR')) {
    return 'sources.errorDownstream';
  }
  if (msg.includes('Network') || msg.includes('fetch')) {
    return 'sources.errorNetwork';
  }
  return 'sources.errorGeneric';
}

/**
 * Maps a FAILED knowledge source's backend errorMessage to a safe i18n key.
 * Prevents raw technical strings from being displayed verbatim to end users.
 * Exported for unit testing.
 */
export function getFriendlySourceErrorKey(errorMessage?: string): string {
  if (!errorMessage) return 'sources.errorGeneric';
  const m = errorMessage.toLowerCase();
  if (m.includes('interrupted') || m.includes('service restarted')) {
    return 'sources.errorServiceRestarted';
  }
  if (m.includes('timeout') || m.includes('timed out')) {
    return 'sources.errorTimeout';
  }
  if (m.includes('too large') || m.includes('size limit')) {
    return 'sources.errorFileTooLarge';
  }
  return 'sources.errorGeneric';
}

/** @deprecated Use getSourceErrorKey() + t() instead. Kept for unit tests. */
export function parseSourceError(e: unknown): string {
  if (!e) return '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2\u05D4';
  const msg = String(e);
  if (msg.includes('Unauthorized') || msg.includes('Auth required')) {
    return '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D4\u05E8\u05E9\u05D0\u05D4 \u2014 \u05E0\u05D0 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9 \u05D5\u05DC\u05E0\u05E1\u05D5\u05EA \u05E9\u05D5\u05D1. \u05D0\u05DD \u05D4\u05D1\u05E2\u05D9\u05D4 \u05E0\u05DE\u05E9\u05DB\u05EA, \u05E4\u05E0\u05D4 \u05DC\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA.';
  }
  if (msg.includes('DOWNSTREAM_SERVICE_ERROR')) {
    return '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D9\u05E8\u05D5\u05EA \u05D4\u05E4\u05E0\u05D9\u05DE\u05D9 \u2014 \u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05E9\u05E8\u05EA \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05DE\u05E1\u05E4\u05E8 \u05E9\u05E0\u05D9\u05D5\u05EA.';
  }
  if (msg.includes('Network') || msg.includes('fetch')) {
    return '\u05E9\u05D2\u05D9\u05D0\u05EA \u05E8\u05E9\u05EA \u2014 \u05D1\u05D3\u05D5\u05E7 \u05E9\u05D4\u05E9\u05E8\u05EA \u05E4\u05D5\u05E2\u05DC \u05D5\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.';
  }
  return IS_DEV_MODE ? msg : '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D5\u05E1\u05E4\u05EA \u05D4\u05DE\u05E7\u05D5\u05E8. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.';
}
