/**
 * Unit tests for G-09: in-memory sliding-window rate limiter.
 */
import { describe, it, expect } from 'vitest';

// Import directly — each test uses unique keys so shared module state is fine
import { checkRateLimit, MAX_REQUESTS } from '../src/middleware/rate-limit.js';

const uid = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe('checkRateLimit — basic behaviour', () => {
  it('allows first request', () => {
    const result = checkRateLimit(uid());
    expect(result.allowed).toBe(true);
  });

  it('returns remaining count below MAX_REQUESTS after first call', () => {
    const result = checkRateLimit(uid());
    expect(result.remaining).toBe(MAX_REQUESTS - 1);
  });

  it('returns resetAt timestamp in the future', () => {
    const result = checkRateLimit(uid());
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('decrements remaining on each successive call', () => {
    const key = uid();
    const r1 = checkRateLimit(key);
    const r2 = checkRateLimit(key);
    expect(r2.remaining).toBe(r1.remaining - 1);
  });

  it('different keys have independent counters', () => {
    const key1 = uid();
    const key2 = uid();
    checkRateLimit(key1);
    checkRateLimit(key1);
    const r2 = checkRateLimit(key2);
    // key2 should still have full remaining
    expect(r2.remaining).toBe(MAX_REQUESTS - 1);
  });
});

describe('checkRateLimit — limit enforcement', () => {
  it('blocks request once MAX_REQUESTS is reached', () => {
    const key = uid();
    // Exhaust the limit
    for (let i = 0; i < MAX_REQUESTS; i++) {
      checkRateLimit(key);
    }
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('blocked result still provides a resetAt in the future', () => {
    const key = uid();
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
    const blocked = checkRateLimit(key);
    expect(blocked.resetAt).toBeGreaterThan(Date.now());
  });
});
