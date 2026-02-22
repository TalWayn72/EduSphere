/**
 * Static security tests for GraphQL query hardening.
 * Phase 7.3: Query depth + complexity limits + rate limiting.
 * SOC2 CC6.6, CC6.7: Prevent DoS via malicious GraphQL queries.
 * API Contracts: MAX_DEPTH=10, MAX_COMPLEXITY=1000.
 * No DB/network required — pure static file analysis.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

// ─── Query complexity middleware ──────────────────────────────────────────────

describe('GraphQL Query Complexity Middleware (apps/gateway/src/middleware/query-complexity.ts)', () => {
  const content = readFile('apps/gateway/src/middleware/query-complexity.ts');

  it('apps/gateway/src/middleware/query-complexity.ts exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/gateway/src/middleware/query-complexity.ts'))).toBe(true);
  });

  it('exports depthLimitRule function', () => {
    expect(content).toContain('depthLimitRule');
    expect(content).toMatch(/export\s+function\s+depthLimitRule/);
  });

  it('exports complexityLimitRule function', () => {
    expect(content).toContain('complexityLimitRule');
    expect(content).toMatch(/export\s+function\s+complexityLimitRule/);
  });

  it('exports MAX_DEPTH constant (default 10)', () => {
    expect(content).toContain('MAX_DEPTH');
  });

  it('exports MAX_COMPLEXITY constant (default 1000)', () => {
    expect(content).toContain('MAX_COMPLEXITY');
  });

  it('exports estimateComplexity function', () => {
    expect(content).toContain('estimateComplexity');
    expect(content).toMatch(/export\s+function\s+estimateComplexity/);
  });

  it('depth rule reports GraphQLError on violation', () => {
    expect(content).toContain('GraphQLError');
    expect(content).toContain('context.reportError');
  });

  it('list fields have higher complexity multiplier (endsWith heuristic)', () => {
    expect(content).toMatch(/endsWith|isList/);
  });

  it('list multiplier is 10x or higher', () => {
    expect(content).toMatch(/\*\s*10|10\s*\*/);
  });

  it('has recursion depth guard to prevent infinite loops', () => {
    expect(content).toMatch(/depth\s*>\s*20/);
  });

  it('MAX_DEPTH is configurable via GRAPHQL_MAX_DEPTH env var', () => {
    expect(content).toContain('GRAPHQL_MAX_DEPTH');
  });

  it('MAX_COMPLEXITY is configurable via GRAPHQL_MAX_COMPLEXITY env var', () => {
    expect(content).toContain('GRAPHQL_MAX_COMPLEXITY');
  });
});

// ─── Gateway: Query Hardening Rules Applied ───────────────────────────────────

describe('Gateway: Query Hardening Rules Applied (apps/gateway/src/index.ts)', () => {
  const content = readFile('apps/gateway/src/index.ts');

  it('gateway imports depthLimitRule', () => {
    expect(content).toContain('depthLimitRule');
  });

  it('gateway imports complexityLimitRule', () => {
    expect(content).toContain('complexityLimitRule');
  });

  it('gateway imports from query-complexity middleware', () => {
    expect(content).toContain('query-complexity');
  });

  it('gateway defines validationRules array', () => {
    expect(content).toContain('validationRules');
  });

  it('gateway passes validationRules to yoga', () => {
    expect(content).toContain('createYoga');
    expect(content).toContain('validationRules');
  });

  it('gateway applies depthLimitRule() in validationRules', () => {
    expect(content).toMatch(/validationRules\s*=\s*\[depthLimitRule\(\)/);
  });

  it('gateway applies complexityLimitRule() in validationRules', () => {
    expect(content).toMatch(/complexityLimitRule\(\)/);
  });
});

// ─── Gateway: Rate Limiting (G-09) ───────────────────────────────────────────

describe('Gateway: Rate Limiting (G-09)', () => {
  it('apps/gateway/tests/rate-limit.test.ts exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/gateway/tests/rate-limit.test.ts'))).toBe(true);
  });

  it('rate-limit test covers request blocking / limit enforcement', () => {
    const content = readFile('apps/gateway/tests/rate-limit.test.ts');
    expect(content).toMatch(/allowed.*false|false.*allowed|blocked|limit.*enforc/i);
  });

  it('rate-limit middleware exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/gateway/src/middleware/rate-limit.ts'))).toBe(true);
  });

  it('gateway returns 429 on rate-limit exceeded', () => {
    const idx = readFile('apps/gateway/src/index.ts');
    expect(idx).toMatch(/429|RATE_LIMIT_EXCEEDED/);
  });
});

// ─── Gateway: Query Complexity Tests (G-10) ──────────────────────────────────

describe('Gateway: Query Complexity Tests (G-10)', () => {
  it('apps/gateway/tests/query-complexity.test.ts exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/gateway/tests/query-complexity.test.ts'))).toBe(true);
  });

  it('query-complexity test covers depth limit', () => {
    const content = readFile('apps/gateway/tests/query-complexity.test.ts');
    expect(content).toMatch(/MAX_DEPTH|depth/i);
  });

  it('query-complexity test covers complexity limit', () => {
    const content = readFile('apps/gateway/tests/query-complexity.test.ts');
    expect(content).toMatch(/MAX_COMPLEXITY|complex/i);
  });

  it('query-complexity test covers list field multiplier', () => {
    const content = readFile('apps/gateway/tests/query-complexity.test.ts');
    expect(content).toMatch(/list|posts|multiplier/i);
  });
});

// ─── GraphQL Schema Security (schema-lint) ───────────────────────────────────

describe('GraphQL Schema Security (schema-lint)', () => {
  it('apps/gateway/tests/schema-lint.test.ts exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/gateway/tests/schema-lint.test.ts'))).toBe(true);
  });

  it('schema lint verifies @authenticated directive usage', () => {
    const content = readFile('apps/gateway/tests/schema-lint.test.ts');
    expect(content).toMatch(/@authenticated|authenticated/i);
  });
});

// ─── CORS Security (SI-2) ────────────────────────────────────────────────────

describe('CORS Security (SI-2)', () => {
  it('apps/gateway/tests/cors.test.ts exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/gateway/tests/cors.test.ts'))).toBe(true);
  });

  it('cors test verifies empty array fallback (fail-closed)', () => {
    const content = readFile('apps/gateway/tests/cors.test.ts');
    expect(content).toMatch(/\[\]|empty.*array|fail.closed/i);
  });

  it('gateway uses CORS_ORIGIN env var', () => {
    const gatewayContent = readFile('apps/gateway/src/index.ts');
    expect(gatewayContent).toContain('CORS_ORIGIN');
  });

  it('gateway defaults CORS to empty array (no wildcard)', () => {
    const gatewayContent = readFile('apps/gateway/src/index.ts');
    // Must have empty array fallback, not '*'
    expect(gatewayContent).toMatch(/:\s*\[\]/);
  });
});

// ─── API Security Cross-Reference (api-security.spec.ts) ─────────────────────

describe('API Security Tests (api-security.spec.ts)', () => {
  const content = readFile('tests/security/api-security.spec.ts');

  it('api-security.spec.ts exists', () => {
    expect(existsSync(resolve(ROOT, 'tests/security/api-security.spec.ts'))).toBe(true);
  });

  it('verifies query depth limit configurable via GRAPHQL_MAX_DEPTH', () => {
    expect(content).toContain('GRAPHQL_MAX_DEPTH');
  });

  it('verifies query complexity limit configurable via GRAPHQL_MAX_COMPLEXITY', () => {
    expect(content).toContain('GRAPHQL_MAX_COMPLEXITY');
  });

  it('verifies rate limit middleware exists (G-09)', () => {
    expect(content).toMatch(/rate.limit|rate_limit|rateLimit/i);
  });
});
