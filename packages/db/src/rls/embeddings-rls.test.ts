/**
 * RLS validation tests for embedding tables.
 *
 * Tables covered:
 *   content_embeddings           — tenant via courses JOIN
 *   annotation_embeddings        — tenant via annotations JOIN
 *   concept_embeddings           — direct tenant_id column
 *   knowledge_source_chunk_embeddings — tenant via knowledge_sources JOIN
 *
 * All tests are unit-style (no live DB required). They verify the pgPolicy
 * SQL expressions in the schema file use app.current_tenant and the correct
 * access patterns.
 *
 * Security Invariant SI-3: Tenant isolation via app.current_tenant
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { withTenantContext } from './withTenantContext';
import type { TenantContext } from './withTenantContext';
import type { DrizzleDB } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockDb(capturedCalls: string[]): DrizzleDB {
  const mockTx = {
    execute: vi.fn(async (sqlObj: unknown) => {
      capturedCalls.push(JSON.stringify(sqlObj));
    }),
  };
  return {
    transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
      cb(mockTx)
    ),
  } as unknown as DrizzleDB;
}

const TENANT_A_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'user-aaaa-0001',
  userRole: 'INSTRUCTOR',
};

const TENANT_B_CTX: TenantContext = {
  tenantId: 'tenant-bbbb-0002',
  userId: 'user-bbbb-0002',
  userRole: 'INSTRUCTOR',
};

const embeddingsFile = readFileSync(
  resolve(__dirname, '../schema/embeddings.ts'),
  'utf8'
);

// ---------------------------------------------------------------------------
// content_embeddings RLS
// ---------------------------------------------------------------------------

describe('content_embeddings RLS policy', () => {
  it('uses app.current_tenant via EXISTS subquery', () => {
    const policyStart = embeddingsFile.indexOf('content_embeddings_rls');
    const policyEnd = embeddingsFile.indexOf('enableRLS()', policyStart);
    const policySection = embeddingsFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('app.current_tenant');
  });

  it('uses EXISTS JOIN through transcript_segments and courses', () => {
    const policyStart = embeddingsFile.indexOf('content_embeddings_rls');
    const policyEnd = embeddingsFile.indexOf(').enableRLS()', policyStart);
    const policySection = embeddingsFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('transcript_segments');
    expect(policySection).toContain('courses');
  });

  it('enableRLS is called on content_embeddings', () => {
    const tableSection = embeddingsFile.slice(
      embeddingsFile.indexOf("'content_embeddings'"),
      embeddingsFile.indexOf("'annotation_embeddings'")
    );
    expect(tableSection).toContain('enableRLS()');
  });
});

// ---------------------------------------------------------------------------
// annotation_embeddings RLS
// ---------------------------------------------------------------------------

describe('annotation_embeddings RLS policy', () => {
  it('uses app.current_tenant via annotations JOIN', () => {
    const policyStart = embeddingsFile.indexOf('annotation_embeddings_rls');
    const policyEnd = embeddingsFile.indexOf('enableRLS()', policyStart);
    const policySection = embeddingsFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('app.current_tenant');
    expect(policySection).toContain('annotations');
  });

  it('enableRLS is called on annotation_embeddings', () => {
    const tableStart = embeddingsFile.indexOf("'annotation_embeddings'");
    const tableEnd = embeddingsFile.indexOf("'concept_embeddings'");
    const tableSection = embeddingsFile.slice(tableStart, tableEnd);
    expect(tableSection).toContain('enableRLS()');
  });
});

// ---------------------------------------------------------------------------
// concept_embeddings RLS — direct tenant_id column
// ---------------------------------------------------------------------------

describe('concept_embeddings RLS policy', () => {
  it('uses direct tenant_id column for tenant isolation', () => {
    const policyStart = embeddingsFile.indexOf('concept_embeddings_rls');
    const policyEnd = embeddingsFile.indexOf('enableRLS()', policyStart);
    const policySection = embeddingsFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('app.current_tenant');
    expect(policySection).toContain('tenant_id');
  });

  it('has both using and withCheck policies', () => {
    const tableStart = embeddingsFile.indexOf("'concept_embeddings'");
    const tableEnd = embeddingsFile.indexOf('contentEmbeddingsHnswIdx');
    const tableSection = embeddingsFile.slice(tableStart, tableEnd);
    expect(tableSection).toContain('withCheck');
    expect(tableSection).toContain('using');
  });

  it('concept_embeddings has tenant_id column directly', () => {
    const tableStart = embeddingsFile.indexOf("'concept_embeddings'");
    const tableEnd = embeddingsFile.indexOf('contentEmbeddingsHnswIdx');
    const tableSection = embeddingsFile.slice(tableStart, tableEnd);
    expect(tableSection).toContain('tenant_id');
  });
});

// ---------------------------------------------------------------------------
// knowledge_source_chunk_embeddings RLS
// ---------------------------------------------------------------------------

describe('knowledge_source_chunk_embeddings RLS policy', () => {
  it('uses app.current_tenant via knowledge_sources JOIN', () => {
    const policyStart = embeddingsFile.indexOf('ks_chunk_embeddings_rls');
    const policyEnd = embeddingsFile.indexOf('enableRLS()', policyStart);
    const policySection = embeddingsFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('app.current_tenant');
    expect(policySection).toContain('knowledge_sources');
  });

  it('enableRLS is called on knowledge_source_chunk_embeddings', () => {
    const tableStart = embeddingsFile.indexOf(
      "'knowledge_source_chunk_embeddings'"
    );
    const tableEnd = embeddingsFile.indexOf('ksChunkEmbeddingsHnswIdx');
    const tableSection = embeddingsFile.slice(tableStart, tableEnd);
    expect(tableSection).toContain('enableRLS()');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: embedding access isolation
// ---------------------------------------------------------------------------

describe('withTenantContext: embedding tenant isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tenant-A context does not set tenant-B ID', async () => {
    const callsA: string[] = [];
    const dbA = buildMockDb(callsA);
    await withTenantContext(dbA, TENANT_A_CTX, async () => 'a');

    expect(callsA.some((c) => c.includes('tenant-bbbb-0002'))).toBe(false);
  });

  it('tenant-B context does not set tenant-A ID', async () => {
    const callsB: string[] = [];
    const dbB = buildMockDb(callsB);
    await withTenantContext(dbB, TENANT_B_CTX, async () => 'b');

    expect(callsB.some((c) => c.includes('tenant-aaaa-0001'))).toBe(false);
  });
});
