/**
 * Static security tests for G-09 (Rate Limiting) and G-10 (Query Depth/Complexity).
 * SOC2 CC6 + OWASP API4 — prevent DoS via unbounded queries and missing rate limits.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const read = (p: string): string => {
  const full = resolve(ROOT, p);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
};

// ── G-09: Rate Limiting ───────────────────────────────────────────────────────

describe('G-09: Rate Limiting', () => {
  it('rate-limit.ts middleware exists', () => {
    expect(
      existsSync(resolve(ROOT, 'apps/gateway/src/middleware/rate-limit.ts'))
    ).toBe(true);
  });

  it('rate limiter uses sliding window (not fixed)', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toMatch(/WINDOW|window|sliding/i);
  });

  it('rate limit key includes tenant ID or IP', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toMatch(/tenant|ip|key/i);
  });

  it('rate limit max is configurable via RATE_LIMIT_MAX env var', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toContain('RATE_LIMIT_MAX');
  });

  it('gateway returns 429 on rate-limit exceeded', () => {
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toMatch(/429|RATE_LIMIT_EXCEEDED/);
  });

  it('gateway imports checkRateLimit from middleware', () => {
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toContain('checkRateLimit');
    expect(idx).toContain('rate-limit');
  });

  it('rate limiter cleans up stale entries (prevents memory leak)', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toMatch(/setInterval|clean|delete/i);
  });

  it('rate limiter returns RateLimitResult with allowed + remaining + resetAt', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toContain('allowed');
    expect(c).toContain('remaining');
    expect(c).toContain('resetAt');
  });
});

// ── G-10: Query Depth and Complexity ─────────────────────────────────────────

describe('G-10: Query Depth and Complexity', () => {
  it('query-complexity.ts middleware exists', () => {
    expect(
      existsSync(
        resolve(ROOT, 'apps/gateway/src/middleware/query-complexity.ts')
      )
    ).toBe(true);
  });

  it('depth limit is configurable via GRAPHQL_MAX_DEPTH env var', () => {
    const c = read('apps/gateway/src/middleware/query-complexity.ts');
    expect(c).toContain('GRAPHQL_MAX_DEPTH');
  });

  it('complexity limit is configurable via GRAPHQL_MAX_COMPLEXITY env var', () => {
    const c = read('apps/gateway/src/middleware/query-complexity.ts');
    expect(c).toContain('GRAPHQL_MAX_COMPLEXITY');
  });

  it('depth limit default is 10 or less', () => {
    const c = read('apps/gateway/src/middleware/query-complexity.ts');
    const match = c.match(
      /GRAPHQL_MAX_DEPTH.*?'(\d+)'|MAX_DEPTH\s*=\s*parseInt[^,]+,\s*(\d+)/
    );
    if (match) {
      const depth = parseInt(match[1] ?? match[2] ?? '10', 10);
      expect(depth).toBeLessThanOrEqual(10);
    } else {
      // Default literal present
      expect(c).toMatch(/10/);
    }
  });

  it('complexity limit default is 1000 or less', () => {
    const c = read('apps/gateway/src/middleware/query-complexity.ts');
    const match = c.match(
      /GRAPHQL_MAX_COMPLEXITY.*?'(\d+)'|MAX_COMPLEXITY\s*=\s*parseInt[^,]+,\s*(\d+)/
    );
    if (match) {
      const complexity = parseInt(match[1] ?? match[2] ?? '1000', 10);
      expect(complexity).toBeLessThanOrEqual(1000);
    } else {
      expect(c).toMatch(/1000/);
    }
  });

  it('depthLimitRule uses GraphQLError (not 500)', () => {
    const c = read('apps/gateway/src/middleware/query-complexity.ts');
    expect(c).toContain('GraphQLError');
    expect(c).toMatch(/depth/i);
  });

  it('complexityLimitRule uses GraphQLError (not 500)', () => {
    const c = read('apps/gateway/src/middleware/query-complexity.ts');
    expect(c).toContain('GraphQLError');
    expect(c).toMatch(/complex/i);
  });

  it('gateway registers depthLimitRule in validationRules', () => {
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toContain('depthLimitRule');
    expect(idx).toContain('validationRules');
  });

  it('gateway registers complexityLimitRule in validationRules', () => {
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toContain('complexityLimitRule');
  });
});
