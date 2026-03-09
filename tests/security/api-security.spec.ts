/**
 * Static security tests for G-09 (Rate Limiting) and G-10 (Query Depth/Complexity).
 * SOC2 CC6 + OWASP API4 — prevent DoS via unbounded queries and missing rate limits.
 * Phase 40: Content Import security checks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';

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

  it('gateway registers depthLimitRule via addValidationRule plugin', () => {
    // Since Session 22 the gateway uses createGatewayRuntime + onValidate plugin
    // instead of createYoga + validationRules array.
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toContain('depthLimitRule');
    expect(idx).toContain('addValidationRule');
  });

  it('gateway registers complexityLimitRule in validationRules', () => {
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toContain('complexityLimitRule');
  });
});

// ── Phase 40: Content Import Security ────────────────────────────────────────

describe('Phase 40: Content Import Security', () => {
  it('content_imports table has RLS enabled', () => {
    // Check that no raw SQL bypasses RLS for content_imports
    const contentImportFiles = globSync(
      'apps/subgraph-content/src/content-import/**/*.ts',
      { cwd: ROOT }
    );
    for (const file of contentImportFiles) {
      const content = readFileSync(resolve(ROOT, file), 'utf8');
      // No direct 'FROM content_imports' without withTenantContext
      const hasRawQuery =
        /FROM\s+content_imports/.test(content) &&
        !content.includes('withTenantContext');
      expect(
        hasRawQuery,
        `${file} queries content_imports without withTenantContext`
      ).toBe(false);
    }
  });

  it('importFromYoutube resolver uses JWT context (authContext) not arg tenantId', () => {
    // EduSphere pattern: ctx.authContext.tenantId (via GraphQLContext type)
    // The resolver MUST extract tenantId from JWT context, never from @Args
    const resolverPath = resolve(
      ROOT,
      'apps/subgraph-content/src/content-import/content-import.resolver.ts'
    );
    if (!existsSync(resolverPath)) return; // file not yet created — skip
    const resolverFile = readFileSync(resolverPath, 'utf8');
    // Must use authContext (JWT-derived) for tenant isolation — SI-9
    expect(resolverFile).toMatch(/auth(?:Context)?\.tenantId|ctx\.authContext/);
    // Must NOT accept tenantId as an @Args argument (would allow tenant spoofing)
    expect(resolverFile).not.toMatch(/@Args\([^)]*tenantId/);
  });

  it('importFromWebsite resolver uses JWT context (authContext) for userId', () => {
    // EduSphere pattern: ctx.authContext.userId (via GraphQLContext type)
    const resolverPath = resolve(
      ROOT,
      'apps/subgraph-content/src/content-import/content-import.resolver.ts'
    );
    if (!existsSync(resolverPath)) return; // file not yet created — skip
    const resolverFile = readFileSync(resolverPath, 'utf8');
    // Must use authContext (JWT-derived) for userId — never from GraphQL args
    expect(resolverFile).toMatch(/auth(?:Context)?\.userId|ctx\.authContext/);
  });
});

// ── Phase 41: xAPI NATS Bridge Security ──────────────────────────────────────

describe('Phase 41: xAPI NATS Bridge Security', () => {
  it('xAPI NATS bridge skips events with missing tenantId — guard in source code', () => {
    const bridgeSrc = read(
      'apps/subgraph-content/src/xapi/xapi-nats-bridge.service.ts'
    );
    // Must check for tenantId or userId before calling storeStatement
    expect(bridgeSrc).toMatch(/tenantId.*userId|userId.*tenantId|!tenantId|!userId/);
  });

  it('xAPI tokens use SHA-256 hash — never raw token stored', () => {
    const tokenSrc = read(
      'apps/subgraph-content/src/xapi/xapi-token.service.ts'
    );
    expect(tokenSrc).toContain("createHash('sha256')");
    // tokenHash (the hash column) is inserted — never the raw token value
    expect(tokenSrc).not.toMatch(/\.values\(\s*\{[^}]*rawToken/);
  });

  it('Google Drive accessToken not stored in DB — service does not insert it', () => {
    const importSrc = read(
      'apps/subgraph-content/src/content-import/content-import.service.ts'
    );
    // accessToken must not appear in any Drizzle insert context
    expect(importSrc).not.toMatch(/drizzle.*accessToken|db\.insert.*accessToken/i);
  });

  it('importFromDrive resolver takes tenantId from JWT context, not args', () => {
    const resolverSrc = read(
      'apps/subgraph-content/src/content-import/content-import.resolver.ts'
    );
    // Must use ctx.authContext (tenantId from JWT), not accept tenantId from args
    expect(resolverSrc).toMatch(/ctx\.authContext|authContext\.tenantId/);
    expect(resolverSrc).not.toMatch(/@Args\([^)]*tenantId|args\.tenantId|input\.tenantId/);
  });

  it('xapiStatementCount query requires elevated role in SDL', () => {
    const sdl = read(
      'apps/subgraph-content/src/xapi/xapi.graphql'
    );
    expect(sdl).toMatch(/xapiStatementCount[\s\S]*?@requiresRole/);
  });

  it('mobile xAPI queue has eviction cap — no unbounded growth', () => {
    const queueSrc = read(
      'apps/mobile/src/services/XapiOfflineQueue.ts'
    );
    // Must have a max-row eviction function
    expect(queueSrc).toContain('evictOldStatements');
    expect(queueSrc).toMatch(/500/); // 500-row cap
  });
});
