/**
 * In-memory sliding window rate limiter — G-09.
 * SOC2 CC6: Prevent request flooding per tenant/IP.
 * For production with Redis: replace the Map store with ioredis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_REQUESTS = parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10);

// Clean up stale entries every 5 minutes to prevent memory leaks
const cleanupInterval = setInterval(
  () => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  },
  5 * 60 * 1000,
);

// Allow test teardown without keeping Node.js alive
if (cleanupInterval.unref) cleanupInterval.unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (tenantId or IP address).
 * Uses sliding window algorithm.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const entry = store.get(key) ?? { timestamps: [] };
  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const allowed = entry.timestamps.length < MAX_REQUESTS;

  if (allowed) {
    entry.timestamps.push(now);
    store.set(key, entry);
  }

  const oldest = entry.timestamps[0] ?? now;
  return {
    allowed,
    remaining: Math.max(0, MAX_REQUESTS - entry.timestamps.length),
    resetAt: oldest + WINDOW_MS,
  };
}

/** Expose store size for observability / health checks. */
export function getRateLimitStoreSize(): number {
  return store.size;
}
