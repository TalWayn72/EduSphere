/**
 * OWASP LLM06 / SI-9 — pgvector Cross-Tenant RLS Audit
 *
 * Static source analysis verifying that ALL pgvector similarity queries in the
 * embedding store and service include a tenant_id filter via withTenantContext()
 * so that PostgreSQL RLS session variables are active when the query runs.
 *
 * A similarity search without RLS context would allow one tenant to retrieve
 * embeddings from another tenant's documents (cross-tenant data leak).
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = resolve(
  join(import.meta.dirname, '.')
);

function load(filename: string): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(resolve(BASE, filename), 'utf-8');
}

describe('pgvector RLS cross-tenant audit (OWASP LLM06 / SI-9)', () => {
  let storeSrc: string;
  let serviceSrc: string;
  let resolverSrc: string;

  beforeAll(() => {
    storeSrc = load('embedding-store.service.ts');
    serviceSrc = load('embedding.service.ts');
    resolverSrc = load('embedding.resolver.ts');
  });

  // ── Store: withTenantContext wrapping ────────────────────────────────────

  it('embedding-store imports withTenantContext from @edusphere/db', () => {
    expect(storeSrc).toMatch(/withTenantContext/);
    expect(storeSrc).toMatch(/@edusphere\/db/);
  });

  it('searchByVector calls withTenantContext (not a bare db.execute)', () => {
    // The pattern must show withTenantContext wrapping tx.execute, not bare this.db.execute
    expect(storeSrc).toMatch(/withTenantContext\s*\(\s*this\.db/);
  });

  it('ilikeFallback calls withTenantContext', () => {
    const ilkSection = storeSrc.slice(storeSrc.indexOf('ilikeFallback'));
    expect(ilkSection).toMatch(/withTenantContext/);
  });

  it('searchByVector SQL includes ma.tenant_id filter', () => {
    expect(storeSrc).toMatch(/ma\.tenant_id\s*=\s*current_setting/);
  });

  it('searchByVector SQL JOINs transcript_segments → transcripts → media_assets for tenant filter', () => {
    expect(storeSrc).toMatch(/JOIN\s+transcripts\s+tr/i);
    expect(storeSrc).toMatch(/JOIN\s+media_assets\s+ma/i);
  });

  it('searchByVector accepts TenantContext parameter', () => {
    const fnSignature = storeSrc.match(
      /searchByVector\s*\([^)]+\)/s
    )?.[0] ?? '';
    expect(fnSignature).toMatch(/TenantContext/);
  });

  it('ilikeFallback accepts TenantContext parameter', () => {
    const fnSignature = storeSrc.match(
      /ilikeFallback\s*\([^)]+\)/s
    )?.[0] ?? '';
    expect(fnSignature).toMatch(/TenantContext/);
  });

  // ── Service: TenantContext threaded through ────────────────────────────

  it('embedding-service imports TenantContext', () => {
    expect(serviceSrc).toMatch(/TenantContext/);
  });

  it('semanticSearch receives TenantContext (not bare tenantId string)', () => {
    const fnSignature = serviceSrc.match(
      /semanticSearch\s*\([^)]+\)/s
    )?.[0] ?? '';
    expect(fnSignature).toMatch(/TenantContext/);
    expect(fnSignature).not.toMatch(/tenantId:\s*string/);
  });

  it('semanticSearchByVector receives TenantContext', () => {
    const fnSignature = serviceSrc.match(
      /semanticSearchByVector\s*\([^)]+\)/s
    )?.[0] ?? '';
    expect(fnSignature).toMatch(/TenantContext/);
  });

  it('service forwards TenantContext to store.searchByVector', () => {
    // Should pass the ctx variable through, not construct a new object inline
    expect(serviceSrc).toMatch(/store\.searchByVector\([^)]*tenantCtx/);
  });

  it('service forwards TenantContext to store.ilikeFallback', () => {
    expect(serviceSrc).toMatch(/store\.ilikeFallback\([^)]*tenantCtx/);
  });

  // ── Resolver: context extraction ─────────────────────────────────────

  it('resolver imports @Context decorator for tenant extraction', () => {
    expect(resolverSrc).toMatch(/@Context/);
  });

  it('resolver calls requireTenantCtx before semanticSearch', () => {
    const searchFn = resolverSrc.slice(resolverSrc.indexOf('semanticSearch'));
    expect(searchFn).toMatch(/requireTenantCtx/);
  });

  it('resolver throws UnauthorizedException when tenant context is missing', () => {
    expect(resolverSrc).toMatch(/UnauthorizedException/);
    expect(resolverSrc).toMatch(/Missing tenant context/);
  });

  // ── No bare pgvector queries without tenant filter ─────────────────

  it('store does NOT have bare <=> without withTenantContext context', () => {
    // Every occurrence of the pgvector operator must appear inside the
    // withTenantContext callback (i.e. using `tx.execute`, not `this.db.execute`).
    // Simplest static check: no `this.db.execute` appears in searchByVector.
    const searchSection = storeSrc.slice(storeSrc.indexOf('searchByVector'));
    const endIdx = searchSection.indexOf('\n  async ');
    const body = endIdx > 0 ? searchSection.slice(0, endIdx) : searchSection;
    expect(body).not.toMatch(/this\.db\.execute/);
  });
});
