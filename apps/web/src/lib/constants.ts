/**
 * Shared constants for the web application.
 * Extract magic numbers and repeated string literals here to ensure consistency.
 */

// ── Timing constants (milliseconds) ─────────────────────────────────────────

/** Duration to show a "Copied!" or "Saved!" toast before auto-dismissing. */
export const TOAST_AUTO_DISMISS_MS = 2000;

/** Duration to show a "Saved" confirmation badge before hiding. */
export const SAVED_CONFIRMATION_MS = 3000;

/** Standard debounce delay for search inputs. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Delay for simulated async operations (testing/mocking save). */
export const SIMULATED_SAVE_MS = 1500;

/** Polling/retry delay for refetching after mutations. */
export const REFETCH_DELAY_MS = 3000;

// ── API ─────────────────────────────────────────────────────────────────────

/** GraphQL endpoint URL resolved from env or falling back to relative path. */
export const GRAPHQL_URL: string =
  (import.meta.env['VITE_GRAPHQL_URL'] as string | undefined) ?? '/graphql';
