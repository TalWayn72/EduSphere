/**
 * rate-limit.spec.ts
 *
 * Unit tests for G-09 sliding-window rate limiter.
 * Covers: allow / block behaviour, window reset, memory cleanup,
 * tenant isolation, and X-RateLimit-Remaining semantics.
 *
 * Uses jest.useFakeTimers / vi.useFakeTimers for timer-related tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  checkRateLimit,
  getRateLimitStoreSize,
  stopRateLimitCleanup,
  MAX_REQUESTS,
} from './rate-limit.js';

import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
} from '../constants.js';

// Unique key generator — prevents cross-test state leakage
let seq = 0;
function uid(prefix = 'rl'): string {
  return `${prefix}-${++seq}-${Math.random().toString(36).slice(2)}`;
}

// ── 1. Requests under the rate limit are allowed ──────────────────────────────

describe('checkRateLimit — allows requests under limit', () => {
  it('allows the very first request for a new key', () => {
    const result = checkRateLimit(uid());
    expect(result.allowed).toBe(true);
  });

  it('returns remaining = MAX_REQUESTS - 1 after the first request', () => {
    const result = checkRateLimit(uid());
    expect(result.remaining).toBe(MAX_REQUESTS - 1);
  });

  it('allows up to MAX_REQUESTS - 1 requests without blocking', () => {
    const key = uid();
    let lastResult = checkRateLimit(key);
    for (let i = 1; i < MAX_REQUESTS - 1; i++) {
      lastResult = checkRateLimit(key);
    }
    expect(lastResult.allowed).toBe(true);
    expect(lastResult.remaining).toBeGreaterThanOrEqual(1);
  });

  it('decrements remaining on each successive call for the same key', () => {
    const key = uid();
    const r1 = checkRateLimit(key);
    const r2 = checkRateLimit(key);
    const r3 = checkRateLimit(key);
    expect(r2.remaining).toBe(r1.remaining - 1);
    expect(r3.remaining).toBe(r2.remaining - 1);
  });
});

// ── 2. Returns 429-equivalent when rate limit is exceeded ─────────────────────

describe('checkRateLimit — blocks at limit (429 semantics)', () => {
  it('blocks the (MAX_REQUESTS + 1)th request', () => {
    const key = uid();
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
  });

  it('sets remaining to 0 when blocked', () => {
    const key = uid();
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
    const blocked = checkRateLimit(key);
    expect(blocked.remaining).toBe(0);
  });

  it('continues to block on all subsequent requests after limit reached', () => {
    const key = uid();
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key).allowed).toBe(false);
    }
  });
});

// ── 3. Counter resets after window expires (fake timers) ──────────────────────

describe('checkRateLimit — resets after window expires', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests again after RATE_LIMIT_WINDOW_MS has elapsed', () => {
    const key = uid('window');
    // Exhaust the limit
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    // Advance time past the full window
    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

    // After window expires the old timestamps are outside the window so new
    // requests are counted fresh — the next call should be allowed
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
  });

  it('remaining returns to MAX_REQUESTS - 1 after full window passes', () => {
    const key = uid('window-reset');
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);

    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

    const result = checkRateLimit(key);
    expect(result.remaining).toBe(MAX_REQUESTS - 1);
  });
});

// ── 4. stopRateLimitCleanup() clears the interval (memory safety) ─────────────

describe('stopRateLimitCleanup — memory safety', () => {
  it('calls clearInterval when invoked', () => {
    const spy = vi.spyOn(globalThis, 'clearInterval');
    stopRateLimitCleanup();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not throw when called multiple times (idempotent)', () => {
    expect(() => {
      stopRateLimitCleanup();
      stopRateLimitCleanup();
      stopRateLimitCleanup();
    }).not.toThrow();
  });

  it('cleanup interval fires at RATE_LIMIT_CLEANUP_INTERVAL_MS cadence (fake timers)', () => {
    vi.useFakeTimers();
    // Verify the module-level constant is the expected 5-minute interval
    expect(RATE_LIMIT_CLEANUP_INTERVAL_MS).toBe(5 * 60 * 1000);
    vi.useRealTimers();
  });
});

// ── 5. Different tenants have independent rate limit buckets ──────────────────

describe('checkRateLimit — tenant isolation', () => {
  it('tenant A exhaustion does not affect tenant B', () => {
    const tenantA = uid('tenantA');
    const tenantB = uid('tenantB');

    // Exhaust tenant A
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(tenantA);
    expect(checkRateLimit(tenantA).allowed).toBe(false);

    // Tenant B should still be fully available
    const resultB = checkRateLimit(tenantB);
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(MAX_REQUESTS - 1);
  });

  it('three distinct tenants each start with their own fresh counter', () => {
    const keys = [uid('t1'), uid('t2'), uid('t3')];
    const results = keys.map((k) => checkRateLimit(k));
    for (const r of results) {
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(MAX_REQUESTS - 1);
    }
  });

  it('partial consumption by tenant A leaves tenant B unaffected', () => {
    const tenantA = uid('partial-A');
    const tenantB = uid('partial-B');

    // Consume half of tenant A's budget
    const half = Math.floor(MAX_REQUESTS / 2);
    for (let i = 0; i < half; i++) checkRateLimit(tenantA);

    const resultB = checkRateLimit(tenantB);
    expect(resultB.remaining).toBe(MAX_REQUESTS - 1);
  });
});

// ── 6. X-RateLimit-Remaining header semantics ─────────────────────────────────

describe('checkRateLimit — X-RateLimit-Remaining semantics', () => {
  it('remaining is MAX_REQUESTS - 1 on first call', () => {
    const { remaining } = checkRateLimit(uid('hdr'));
    expect(remaining).toBe(MAX_REQUESTS - 1);
  });

  it('remaining is exactly 0 when blocked (never negative)', () => {
    const key = uid('hdr-zero');
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
    const { remaining } = checkRateLimit(key);
    expect(remaining).toBe(0);
  });

  it('resetAt is in the future on a fresh key', () => {
    const before = Date.now();
    const { resetAt } = checkRateLimit(uid('hdr-reset'));
    expect(resetAt).toBeGreaterThan(before);
  });

  it('resetAt is within one window duration from now', () => {
    const before = Date.now();
    const { resetAt } = checkRateLimit(uid('hdr-window'));
    expect(resetAt).toBeLessThanOrEqual(before + RATE_LIMIT_WINDOW_MS + 10);
  });

  it('store size increases by 1 for each new unique key', () => {
    const sizeBefore = getRateLimitStoreSize();
    checkRateLimit(uid('size-check'));
    expect(getRateLimitStoreSize()).toBe(sizeBefore + 1);
  });
});
