/**
 * Gateway-level constants — rate limiting (G-09 sliding window, SOC2 CC6).
 * Source values extracted from middleware/rate-limit.ts.
 */

/** Sliding window duration: 15 minutes. Used in WINDOW_MS in rate-limit.ts. */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Default max requests per window when RATE_LIMIT_MAX env var is not set.
 * rate-limit.ts reads: parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10)
 */
export const RATE_LIMIT_MAX_REQUESTS = 100;

/** How often the stale-entry cleanup timer runs: 5 minutes. */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Maximum number of keys held in the in-memory rate-limit store.
 * Acts as an LRU eviction guard to prevent unbounded Map growth (Topic 5 fix).
 */
export const RATE_LIMIT_MAX_STORE_SIZE = 10_000;
