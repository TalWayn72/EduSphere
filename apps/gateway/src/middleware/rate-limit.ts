/**
 * In-memory sliding window rate limiter — G-09.
 * SOC2 CC6: Prevent request flooding per tenant/IP.
 *
 * Tiers (per minute):
 *   standard — 100 req/min  (default)
 *   premium  — 1 000 req/min
 *
 * Pilot/unauthenticated tier (per hour):
 *   pilot (unauthenticated) — 5 req/hr  (SC-01: DoS protection on public pilot endpoint)
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
  process.env['RATE_LIMIT_PREMIUM_MAX'] ??
    String(RATE_LIMIT_PREMIUM_MAX_REQUESTS),
  10
);

// SC-01: Separate rate-limit bucket for unauthenticated pilot endpoint.
// Uses a 1-hour sliding window, keyed by IP address (no tenant available pre-auth).
// Max 5 pilot requests per IP per hour.
export const PILOT_RATE_LIMIT_MAX = parseInt(
  process.env['PILOT_RATE_LIMIT_MAX'] ?? '5',
  10
);

// 1-hour window for pilot/unauthenticated requests (SC-01)
export const PILOT_RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour = 60 * 60 * 1000

// Separate store for pilot/unauthenticated requests to isolate from authenticated buckets
const pilotStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for a public (unauthenticated) pilot endpoint request.
 * Keys on IP address (clientIp / x-forwarded-for / remoteAddress).
 * Sliding window: max PILOT_RATE_LIMIT_MAX (5) requests per PILOT_RATE_LIMIT_WINDOW_MS (1 hour).
 * SC-01: Addresses T-02 DoS threat on requestPilot mutation.
 */
export function checkPilotRateLimit(ip: string): RateLimitResult {
  const key = `pilot:${ip}`;
  const now = Date.now();
  const windowStart = now - PILOT_RATE_LIMIT_WINDOW_MS;

  const entry = pilotStore.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const allowed = entry.timestamps.length < PILOT_RATE_LIMIT_MAX;

  if (allowed) {
    entry.timestamps.push(now);
    pilotStore.set(key, entry);
  }

  const oldest = entry.timestamps[0] ?? now;
  return {
    allowed,
    remaining: Math.max(0, PILOT_RATE_LIMIT_MAX - entry.timestamps.length),
    resetAt: oldest + PILOT_RATE_LIMIT_WINDOW_MS,
  };
}

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
