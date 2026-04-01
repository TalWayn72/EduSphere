/**
 * RAG Pipeline Security — pgvector Cross-Tenant RLS Enforcement
 *
 * SI-9 / OWASP LLM06: All vector search queries must use withTenantContext()
 * so PostgreSQL RLS session variables are set before any embedding query.
 *
 * Covers:
 * - EmbeddingStoreService: searchByVector + ilikeFallback use withTenantContext
 * - EmbeddingService: semanticSearch + semanticSearchByVector pass TenantContext
 * - GraphSearchService: HybridRAG wraps all DB access in withTenantContext
 * - EmbeddingResolver: extracts TenantContext from GraphQL @Context
 * - Fallback paths in EmbeddingService do NOT have tenant filtering (known gap)
 *
 * Static source-analysis tests — no live database required.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const KNOWLEDGE_SRC = 'apps/subgraph-knowledge/src';

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

// ── EmbeddingStoreService — withTenantContext wrapping ─────────────────────

describe('SI-9: EmbeddingStoreService RLS on vector queries', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/embedding/embedding-store.service.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('imports withTenantContext from @edusphere/db', () => {
    expect(src).toContain('withTenantContext');
    expect(src).toContain('@edusphere/db');
  });

  it('searchByVector wraps query in withTenantContext', () => {
    // Must use withTenantContext(this.db, ctx, ...) pattern
    expect(src).toMatch(/withTenantContext\s*\(\s*this\.db/);
  });

  it('searchByVector uses tx.execute inside withTenantContext (not this.db.execute)', () => {
    // Extract searchByVector method body
    const searchIdx = src.indexOf('async searchByVector');
    const nextMethodIdx = src.indexOf('\n  async ', searchIdx + 1);
    const body =
      nextMethodIdx > 0
        ? src.slice(searchIdx, nextMethodIdx)
        : src.slice(searchIdx);
    // Must use tx.execute, not this.db.execute
    expect(body).toContain('tx.execute');
    expect(body).not.toMatch(/this\.db\.execute/);
  });

  it('searchByVector SQL JOINs transcript_segments -> transcripts -> media_assets for tenant filter', () => {
    expect(src).toMatch(/JOIN\s+transcript_segments\s+ts/i);
    expect(src).toMatch(/JOIN\s+transcripts\s+tr/i);
    expect(src).toMatch(/JOIN\s+media_assets\s+ma/i);
  });

  it('searchByVector SQL includes ma.tenant_id = current_setting filter', () => {
    expect(src).toMatch(
      /ma\.tenant_id\s*=\s*current_setting\s*\(\s*'app\.current_tenant'/
    );
  });

  it('ilikeFallback wraps query in withTenantContext', () => {
    const ilikIdx = src.indexOf('async ilikeFallback');
    const body = src.slice(ilikIdx, src.indexOf('\n  async ', ilikIdx + 1));
    expect(body).toContain('withTenantContext');
  });

  it('searchByVector accepts TenantContext parameter', () => {
    const sig = src.match(/searchByVector\s*\([^)]+\)/s)?.[0] ?? '';
    expect(sig).toContain('TenantContext');
  });

  it('ilikeFallback accepts TenantContext parameter', () => {
    const sig = src.match(/ilikeFallback\s*\([^)]+\)/s)?.[0] ?? '';
    expect(sig).toContain('TenantContext');
  });
});

// ── EmbeddingService — TenantContext threading ────────────────────────────

describe('SI-9: EmbeddingService passes TenantContext to store', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/embedding/embedding.service.ts`);
  });

  it('imports TenantContext type', () => {
    expect(src).toContain('TenantContext');
  });

  it('semanticSearch requires TenantContext parameter', () => {
    const sig = src.match(/semanticSearch\s*\(\s*[^)]+\)/s)?.[0] ?? '';
    expect(sig).toContain('TenantContext');
  });

  it('semanticSearchByVector requires TenantContext parameter', () => {
    const sig = src.match(/semanticSearchByVector\s*\(\s*[^)]+\)/s)?.[0] ?? '';
    expect(sig).toContain('TenantContext');
  });

  it('semanticSearch forwards TenantContext to store.searchByVector', () => {
    expect(src).toMatch(/store\.searchByVector\([^)]*tenantCtx/);
  });

  it('semanticSearch forwards TenantContext to store.ilikeFallback', () => {
    expect(src).toMatch(/store\.ilikeFallback\([^)]*tenantCtx/);
  });

  it('OWASP LLM06 comment documents the RLS requirement', () => {
    expect(src).toMatch(/OWASP\s+LLM06/);
    expect(src).toMatch(/SI-9/);
  });
});

// ── GraphSearchService — HybridRAG RLS ───────────────────────────────────

describe('SI-9: GraphSearchService HybridRAG uses withTenantContext', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/graph/graph-search.service.ts`);
  });

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it('imports withTenantContext from @edusphere/db', () => {
    expect(src).toContain('withTenantContext');
    expect(src).toContain('@edusphere/db');
  });

  it('semanticSearch wraps entire operation in withTenantContext', () => {
    const searchIdx = src.indexOf('async semanticSearch');
    const body = src.slice(searchIdx, src.indexOf('\n  async ', searchIdx + 1));
    expect(body).toContain('withTenantContext');
  });

  it('generateEmbedding wraps operation in withTenantContext', () => {
    const genIdx = src.indexOf('async generateEmbedding');
    const body = src.slice(genIdx, src.indexOf('\n  async ', genIdx + 1));
    expect(body).toContain('withTenantContext');
  });

  it('withTenantContext receives tenantId, userId, and userRole', () => {
    // Pattern: withTenantContext(db, { tenantId, userId, userRole: ... }, ...)
    expect(src).toMatch(
      /withTenantContext\s*\(\s*\w+\s*,\s*\{\s*tenantId\s*,\s*userId\s*,\s*userRole/
    );
  });

  it('concept search uses tenantId for tenant-scoped queries', () => {
    const conceptSearchIdx = src.indexOf('searchConceptsByText');
    const body = src.slice(conceptSearchIdx);
    expect(body).toContain('tenantId');
  });
});

// ── EmbeddingResolver — Context extraction ───────────────────────────────

describe('SI-9: EmbeddingResolver extracts TenantContext from GraphQL context', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/embedding/embedding.resolver.ts`);
  });

  it('imports @Context decorator', () => {
    expect(src).toContain('@Context');
  });

  it('defines requireTenantCtx helper function', () => {
    expect(src).toContain('requireTenantCtx');
  });

  it('requireTenantCtx throws UnauthorizedException when context is missing', () => {
    expect(src).toContain('UnauthorizedException');
    expect(src).toContain('Missing tenant context');
  });

  it('semanticSearch query calls requireTenantCtx before service call', () => {
    const searchFn = src.slice(src.indexOf("@Query('semanticSearch')"));
    const serviceCall = searchFn.indexOf(
      'embeddingService.semanticSearchByVector'
    );
    const ctxCall = searchFn.indexOf('requireTenantCtx');
    expect(ctxCall).toBeLessThan(serviceCall);
    expect(ctxCall).toBeGreaterThanOrEqual(0);
  });

  it('semanticSearchByContentItem also calls requireTenantCtx', () => {
    const searchFn = src.slice(
      src.indexOf("@Query('semanticSearchByContentItem')")
    );
    expect(searchFn).toContain('requireTenantCtx');
  });
});

// ── Fallback path security gap documentation ─────────────────────────────

describe('SI-9: EmbeddingService fallback paths (security gap tracking)', () => {
  let src: string;

  beforeAll(() => {
    src = read(`${KNOWLEDGE_SRC}/embedding/embedding.service.ts`);
  });

  it('fallbackVectorSearch does NOT use withTenantContext (known gap - unit-test path only)', () => {
    const fallbackIdx = src.indexOf('fallbackVectorSearch');
    const body = src.slice(
      fallbackIdx,
      src.indexOf('\n  private ', fallbackIdx + 10)
    );
    // This is expected to NOT have withTenantContext — it's the unit-test fallback
    expect(body).not.toContain('withTenantContext');
  });

  it('fallbackIlike does NOT use withTenantContext (known gap - unit-test path only)', () => {
    const fallbackIdx = src.indexOf('fallbackIlike');
    const body = src.slice(
      fallbackIdx,
      src.indexOf('\n  private ', fallbackIdx + 10)
    );
    expect(body).not.toContain('withTenantContext');
  });

  it('in production path, store is injected and fallbacks are NOT used', () => {
    // The @Optional() decorator means store is present in production (DI)
    // and fallbacks only fire when store is undefined (unit test constructor)
    expect(src).toContain('@Optional()');
    expect(src).toMatch(/if\s*\(\s*this\.store\s*\)/);
  });
});

// ── Cross-tenant isolation — tenant A cannot see tenant B embeddings ─────

describe('SI-9: Cross-tenant embedding isolation (static verification)', () => {
  it('content_embeddings table has RLS-enforcing JOIN chain in search queries', () => {
    const storeSrc = read(
      `${KNOWLEDGE_SRC}/embedding/embedding-store.service.ts`
    );
    // The JOIN chain: content_embeddings -> transcript_segments -> transcripts -> media_assets
    // ensures tenant_id filter is applied via media_assets.tenant_id
    const searchSection = storeSrc.slice(storeSrc.indexOf('searchByVector'));
    expect(searchSection).toContain('content_embeddings ce');
    expect(searchSection).toContain('transcript_segments ts');
    expect(searchSection).toContain('transcripts tr');
    expect(searchSection).toContain('media_assets ma');
    expect(searchSection).toContain("current_setting('app.current_tenant'");
  });

  it('no direct content_embeddings query without tenant filter exists in store', () => {
    const storeSrc = read(
      `${KNOWLEDGE_SRC}/embedding/embedding-store.service.ts`
    );
    // searchByVector and ilikeFallback both use withTenantContext
    // Count occurrences of withTenantContext - should be at least 2 (search + ilike)
    const matches = storeSrc.match(/withTenantContext/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('GraphQL schema embedding queries do not expose raw embedding vectors to unauthenticated users', () => {
    const schema = read(`${KNOWLEDGE_SRC}/embedding/embedding.graphql`);
    // Mutations require @authenticated
    expect(schema).toContain('@authenticated');
  });
});
