/**
 * Wave 2 — Data Integrity & Core Quality regression tests.
 *
 * Verifies: DB-2 HNSW indexes, DB-3 tenant_id, DB-4 withTimezone,
 * BE-2 Promise.race timeout, BE-3 COUNT(*), BE-5 persistent NATS,
 * FE-1 route-level ErrorBoundary.
 *
 * Static source-file tests — no running database required.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '../..');

const read = (p: string): string =>
  existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '';

// ---------------------------------------------------------------------------
// DB-2: HNSW indexes on embedding tables
// ---------------------------------------------------------------------------
describe('DB-2: HNSW indexes on embedding tables', () => {
  const src = read('packages/db/src/schema/embeddings.ts');

  it('content_embeddings has HNSW index', () => {
    expect(src).toMatch(/idx_content_embeddings_hnsw/);
    expect(src).toMatch(/content_embeddings.*hnsw|hnsw.*content_embeddings/is);
  });

  it('annotation_embeddings has HNSW index', () => {
    expect(src).toMatch(/idx_annotation_embeddings_hnsw/);
  });

  it('concept_embeddings has HNSW index', () => {
    expect(src).toMatch(/idx_concept_embeddings_hnsw/);
  });

  it('HNSW indexes use vector_cosine_ops', () => {
    expect(src).toContain('vector_cosine_ops');
  });
});

// ---------------------------------------------------------------------------
// DB-3: tenant_id on agentSessions
// ---------------------------------------------------------------------------
describe('DB-3: tenant_id on agentSessions', () => {
  const src = read('packages/db/src/schema/agentSessions.ts');

  it('agentSessions has tenant_id column', () => {
    expect(src).toMatch(/tenant_id/);
    expect(src).toMatch(/tenantId.*uuid.*tenant_id/);
  });

  it('tenant_id references tenants table', () => {
    expect(src).toMatch(/references.*tenants/);
  });
});

// ---------------------------------------------------------------------------
// DB-4: withTimezone on timestamp columns
// ---------------------------------------------------------------------------
describe('DB-4: withTimezone on all timestamp columns', () => {
  const SCHEMA_DIR = 'packages/db/src/schema';
  const schemaFiles = existsSync(resolve(ROOT, SCHEMA_DIR))
    ? readdirSync(resolve(ROOT, SCHEMA_DIR))
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.startsWith('_'))
        .map((f) => ({
          name: f,
          content: readFileSync(join(resolve(ROOT, SCHEMA_DIR), f), 'utf-8'),
        }))
    : [];

  it('finds schema files to scan', () => {
    expect(schemaFiles.length).toBeGreaterThan(10);
  });

  it('no timestamp() calls without withTimezone in schema files', () => {
    // Match timestamp('...') that is NOT followed by { withTimezone: true } or { ... withTimezone: true }
    // Allow: timestamp('col', { withTimezone: true })
    // Disallow: timestamp('col') without options or with { } missing withTimezone
    const violations: string[] = [];

    for (const file of schemaFiles) {
      // Find all timestamp( calls
      const timestampCalls = file.content.match(/timestamp\([^)]+\)/g) || [];
      for (const call of timestampCalls) {
        // Skip if it contains withTimezone: true
        if (call.includes('withTimezone: true') || call.includes('withTimezone:true')) {
          continue;
        }
        // Skip if it's a helper function definition (not a column definition)
        if (call.includes('mode:') && !call.includes("'")) {
          continue;
        }
        // Only flag if it looks like a column definition (has a string argument)
        if (call.match(/timestamp\s*\(\s*['"]/)) {
          violations.push(`${file.name}: ${call}`);
        }
      }
    }

    expect(
      violations,
      `Found timestamp columns without withTimezone: true:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// BE-2: AgentService Promise.race timeout
// ---------------------------------------------------------------------------
describe('BE-2: AgentService Promise.race timeout', () => {
  const src = read('apps/subgraph-agent/src/agent/agent.service.ts');

  it('processExecution uses Promise.race', () => {
    expect(src).toContain('Promise.race');
  });

  it('timeout is 5 minutes (300000ms)', () => {
    expect(src).toMatch(/300[_]?000|5\s*\*\s*60\s*\*\s*1000/);
  });

  it('timeout rejects with descriptive error', () => {
    expect(src).toMatch(/timed?\s*out/i);
  });
});

// ---------------------------------------------------------------------------
// BE-3: adminUsers uses COUNT(*) not O(N)
// ---------------------------------------------------------------------------
describe('BE-3: adminUsers uses COUNT(*)', () => {
  const src = read('apps/subgraph-core/src/user/user.service.ts');

  it('adminUsers uses count(*) SQL aggregate', () => {
    expect(src).toMatch(/count\s*\(\s*\*\s*\)/i);
  });

  it('adminUsers does NOT select all user IDs for counting', () => {
    // The old pattern was: select({ id: schema.users.id }).from(schema.users); ... .length
    // This should no longer exist in the adminUsers function
    const adminFn = src.slice(
      src.indexOf('async adminUsers'),
      src.indexOf('}', src.indexOf('return {', src.indexOf('adminUsers')) + 10) + 1
    );
    expect(adminFn).not.toMatch(/select\(\{\s*id:\s*schema\.users\.id\s*\}\).*\.length/s);
  });
});

// ---------------------------------------------------------------------------
// BE-5: MediaService persistent NATS connection
// ---------------------------------------------------------------------------
describe('BE-5: MediaService persistent NATS', () => {
  const src = read('apps/subgraph-content/src/media/media.service.ts');

  it('has a persistent natsConn field', () => {
    expect(src).toMatch(/private\s+natsConn/);
  });

  it('has getNatsConnection helper method', () => {
    expect(src).toMatch(/getNatsConnection|getConnection/);
  });

  it('onModuleDestroy drains NATS connection', () => {
    expect(src).toMatch(/natsConn.*drain|drain.*natsConn/s);
  });

  it('publishMediaUploaded does NOT create new connection per call', () => {
    const publishFn = src.slice(
      src.indexOf('publishMediaUploaded'),
      src.indexOf('}', src.indexOf('publishMediaUploaded') + 200) + 1
    );
    // Should not have connect() inside publishMediaUploaded
    expect(publishFn).not.toMatch(/await\s+connect\(/);
  });
});

// ---------------------------------------------------------------------------
// FE-1: Route-level ErrorBoundary
// ---------------------------------------------------------------------------
describe('FE-1: Route-level ErrorBoundary', () => {
  const src = read('apps/web/src/lib/routes/helpers.tsx');

  it('guarded() imports ErrorBoundary', () => {
    expect(src).toMatch(/import.*ErrorBoundary/);
  });

  it('guarded() wraps routes with ErrorBoundary', () => {
    expect(src).toContain('<ErrorBoundary');
  });

  it('publicPage() also has ErrorBoundary wrapping', () => {
    // Both guarded and public pages should have error boundaries
    const matches = src.match(/<ErrorBoundary/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
