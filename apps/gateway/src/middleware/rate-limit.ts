/**
 * In-memory sliding window rate limiter — G-09.
 * SOC2 CC6: Prevent request flooding per tenant/IP.
 *
 * Tiers (per minute):
 *   standard — 100 req/min  (default)
 *   premium  — 1 000 req/min
 *
 * Premium tenants are declared via the RATE_LIMIT_PREMIUM_TENANTS env var
 * (comma-separated tenant IDs).
 *
 * For production with Redis: replace the Map store with ioredis.
 */
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_PREMIUM_MAX_REQUESTS,
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
} from '../constants.js';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

export const MAX_REQUESTS = parseInt(
  process.env['RATE_LIMIT_MAX'] ?? String(RATE_LIMIT_MAX_REQUESTS),
  10
);

export const PREMIUM_MAX_REQUESTS = parseInt(
  process.env['RATE_LIMIT_PREMIUM_MAX'] ?? String(RATE_LIMIT_PREMIUM_MAX_REQUESTS),
  10
);

/**
 * Set of tenant IDs that are on the premium tier.
 * Populated from RATE_LIMIT_PREMIUM_TENANTS env var (comma-separated).
 */
const premiumTenants: Set<string> = new Set(
  (process.env['RATE_LIMIT_PREMIUM_TENANTS'] ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

// Clean up stale entries to prevent memory leaks
let cleanupIntervalHandle: ReturnType<typeof setInterval> | undefined =
  setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL_MS);

// Allow test teardown without keeping Node.js alive
if (cleanupIntervalHandle.unref) cleanupIntervalHandle.unref();

/** Stop the cleanup timer — call from process shutdown handler to allow clean exit. */
export function stopRateLimitCleanup(): void {
  if (cleanupIntervalHandle !== undefined) {
    clearInterval(cleanupIntervalHandle);
    cleanupIntervalHandle = undefined;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Resolve the effective request ceiling for a given key.
 * Premium tenants receive 1 000 req/min; all others receive 100 req/min.
 */
export function getMaxRequestsForKey(key: string): number {
  return premiumTenants.has(key) ? PREMIUM_MAX_REQUESTS : MAX_REQUESTS;
}

/**
 * Check rate limit for a given key (tenantId or IP address).
 * Uses sliding window algorithm.
 * Premium tenants (declared in RATE_LIMIT_PREMIUM_TENANTS) receive
 * PREMIUM_MAX_REQUESTS (1 000) per minute; all others receive MAX_REQUESTS (100).
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const limit = getMaxRequestsForKey(key);

  const entry = store.get(key) ?? { timestamps: [] };
  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const allowed = entry.timestamps.length < limit;

  if (allowed) {
    entry.timestamps.push(now);
    store.set(key, entry);
  }

  const oldest = entry.timestamps[0] ?? now;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.timestamps.length),
    resetAt: oldest + RATE_LIMIT_WINDOW_MS,
  };
}

/** Expose store size for observability / health checks. */
export function getRateLimitStoreSize(): number {
  return store.size;
}
