/**
 * Gateway-level constants — rate limiting (G-09 sliding window, SOC2 CC6).
 * Source values extracted from middleware/rate-limit.ts.
 */

/** Sliding window duration: 1 minute (per-minute rate limiting). */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * Default max requests per window (standard tier) when RATE_LIMIT_MAX env var
 * is not set. Enforces 100 req/min per tenant for standard tenants.
 */
export const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * Max requests per window for premium tier tenants (1000 req/min).
 * A tenant is considered premium when its ID appears in the
 * RATE_LIMIT_PREMIUM_TENANTS env var (comma-separated list).
 */
export const RATE_LIMIT_PREMIUM_MAX_REQUESTS = 1000;

/** How often the stale-entry cleanup timer runs: 5 minutes. */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Maximum number of keys held in the in-memory rate-limit store.
 * Acts as an LRU eviction guard to prevent unbounded Map growth (Topic 5 fix).
 */
export const RATE_LIMIT_MAX_STORE_SIZE = 10_000;
