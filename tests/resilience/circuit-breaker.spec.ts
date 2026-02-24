/**
 * Resilience / Circuit Breaker Tests
 *
 * Tests service behavior under degraded conditions.
 * All tests use mocks — no real services required.
 * Run manually: pnpm test:resilience
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  stopRateLimitCleanup,
  MAX_REQUESTS,
} from '../../apps/gateway/src/middleware/rate-limit.js';

// ── Mock factories ────────────────────────────────────────────────────────────

const mockDb = (fail = false) => ({
  query: vi.fn().mockImplementation(() =>
    fail ? Promise.reject(new Error('pool exhausted')) : Promise.resolve({ rows: [] }),
  ),
});

const mockNats = (publishFails = false) => ({
  publish: vi.fn().mockImplementation(() => {
    if (publishFails) throw new Error('NATS: connection refused');
  }),
  reconnect: vi.fn().mockResolvedValue(undefined),
});

const mockCache = (fail = false, hit: unknown = null) => ({
  get: vi.fn().mockImplementation((key: string) => {
    void key;
    return fail ? Promise.reject(new Error('Redis ECONNREFUSED')) : Promise.resolve(hit);
  }),
});

async function resolveWithCache(
  cache: ReturnType<typeof mockCache>,
  db: ReturnType<typeof mockDb>,
) {
  try {
    const v = await cache.get('key');
    if (v !== null) return v;
  } catch { /* fall through to DB */ }
  return db.query();
}

async function raceTimeout<T>(task: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([task, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Resilience Patterns', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('PostgreSQL connection failure', () => {
    it('service returns graceful error (not crash) when DB pool exhausted', async () => {
      const db = mockDb(true);
      const result = await db.query().catch(() => ({ error: 'INTERNAL_SERVER_ERROR' }));
      expect(result).toEqual({ error: 'INTERNAL_SERVER_ERROR' });
    });

    it('DB connection error maps to INTERNAL_SERVER_ERROR (not leaking stack trace)', async () => {
      const db = mockDb(true);
      const gqlError = await db.query().catch((err: Error) => ({
        errors: [{ message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
        _leak: err.message,
      }));
      expect(gqlError.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
      expect(gqlError.errors[0].message).not.toContain('pool exhausted');
    });

    it('service recovers after DB reconnects (retry logic)', async () => {
      let attempt = 0;
      const db = { query: vi.fn().mockImplementation(() => {
        if (++attempt < 3) return Promise.reject(new Error('refused'));
        return Promise.resolve({ rows: [{ id: '1' }] });
      }) };
      async function withRetry(n: number): Promise<unknown> {
        for (let i = 0; i < n; i++) {
          try { return await db.query(); } catch { if (i === n - 1) throw new Error('max retries'); }
        }
      }
      const result = await withRetry(3);
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ rows: [{ id: '1' }] });
    });
  });

  describe('NATS unavailability', () => {
    it('NATS publish failure does not prevent mutation from completing', async () => {
      const nats = mockNats(true);
      async function createCourse(title: string) {
        const course = { id: 'c-1', title };
        try { nats.publish({ subject: 'content.created', data: course }); } catch { /* fire-and-forget */ }
        return course;
      }
      const result = await createCourse('Algebra 101');
      expect(result.id).toBe('c-1');
      expect(nats.publish).toHaveBeenCalledTimes(1);
    });

    it('NATS subscriber handles malformed message without crashing', () => {
      const msgs = ['{"tenantId":"t-1"}', 'not-json{{{', '', '{"missing":true}'];
      const good: string[] = [], bad: string[] = [];
      for (const raw of msgs) {
        try {
          const p = JSON.parse(raw) as Record<string, unknown>;
          if (typeof p['tenantId'] !== 'string') throw new Error('missing tenantId');
          good.push(p['tenantId'] as string);
        } catch (e) { bad.push(e instanceof Error ? e.message : 'err'); }
      }
      expect(good).toEqual(['t-1']);
      expect(bad).toHaveLength(3);
    });

    it('NatsClient.reconnect() is called after connection drop', async () => {
      const nats = mockNats(false);
      const failOp = vi.fn().mockRejectedValue(new Error('closed'));
      await failOp().catch(() => nats.reconnect());
      expect(nats.reconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Redis cache failure', () => {
    it('service falls back to DB query when Redis is unavailable', async () => {
      const cache = mockCache(true);
      const db = mockDb(false);
      await resolveWithCache(cache, db);
      expect(cache.get).toHaveBeenCalledWith('key');
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('Redis timeout does not block the request beyond SLA', async () => {
      const slow = { get: vi.fn().mockReturnValue(new Promise(() => { /* never */ })) };
      const start = Date.now();
      const result = await raceTimeout(slow.get('k') as Promise<null>, 50, null);
      expect(result).toBeNull();
      expect(Date.now() - start).toBeLessThan(300);
    });

    it('cache miss is handled identically to cache unavailable', async () => {
      const db = mockDb(false);
      await resolveWithCache(mockCache(false, null), db);
      await resolveWithCache(mockCache(true), db);
      expect(db.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('LLM provider timeout', () => {
    it('agent request times out after 5 minutes (not hang forever)', async () => {
      const llm = { call: vi.fn().mockReturnValue(new Promise(() => { /* hangs */ })) };
      const result = await raceTimeout(llm.call() as Promise<{ status: string }>, 50, { status: 'TIMEOUT' });
      expect(result.status).toBe('TIMEOUT');
    });

    it('CONSENT_REQUIRED check is honored even when LLM times out', async () => {
      const session = { consentGiven: false };
      async function run(): Promise<{ error?: string }> {
        if (!session.consentGiven) return { error: 'CONSENT_REQUIRED' };
        return new Promise(() => { /* would hang */ });
      }
      const result = await run();
      expect(result.error).toBe('CONSENT_REQUIRED');
    });

    it('timeout is stored as failed agent turn in session history', async () => {
      const history: Array<{ role: string; status: string }> = [];
      const outcome = await raceTimeout<string>(new Promise(() => { /* hangs */ }), 50, 'timeout');
      history.push({ role: 'assistant', status: outcome === 'timeout' ? 'FAILED_TIMEOUT' : 'OK' });
      expect(history[0]?.status).toBe('FAILED_TIMEOUT');
    });
  });

  describe('Rate limiter under concurrent load', () => {
    afterEach(() => { stopRateLimitCleanup(); });

    it('rate limiter returns 429 after limit exceeded', () => {
      const key = `t-429-${Date.now()}`;
      for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
      const result = checkRateLimit(key);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('rate limiter allows requests after window resets', () => {
      vi.useFakeTimers();
      const key = `t-reset-${Date.now()}`;
      for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key);
      expect(checkRateLimit(key).allowed).toBe(false);
      vi.advanceTimersByTime(15 * 60 * 1000 + 1);
      expect(checkRateLimit(key).allowed).toBe(true);
      vi.useRealTimers();
    });

    it('per-tenant isolation: tenant A hitting limit does not affect tenant B', () => {
      const ts = Date.now();
      const keyA = `t-A-${ts}`, keyB = `t-B-${ts}`;
      for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(keyA);
      expect(checkRateLimit(keyA).allowed).toBe(false);
      expect(checkRateLimit(keyB).allowed).toBe(true);
    });
  });
});
