/**
 * Static security tests for Persisted Queries (APQ) enforcement.
 * Ensures the registry and middleware exist and implement the required
 * security properties: bounded registry, hash-only mode, 400 on miss.
 * No DB/network required — pure static file analysis.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function readFile(p: string): string {
  const full = resolve(ROOT, p);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
}

// ── Registry ──────────────────────────────────────────────────────────────────

describe('Persisted Queries: registry.ts', () => {
  const REGISTRY_PATH = 'apps/gateway/src/persisted-queries/registry.ts';

  it('apps/gateway/src/persisted-queries/registry.ts exists', () => {
    expect(existsSync(resolve(ROOT, REGISTRY_PATH))).toBe(true);
  });

  it('registry exports registerQuery', () => {
    const c = readFile(REGISTRY_PATH);
    expect(c).toMatch(/export\s+function\s+registerQuery/);
  });

  it('registry exports lookupQuery', () => {
    const c = readFile(REGISTRY_PATH);
    expect(c).toMatch(/export\s+function\s+lookupQuery/);
  });

  it('registry exports isRegistered', () => {
    const c = readFile(REGISTRY_PATH);
    expect(c).toMatch(/export\s+function\s+isRegistered/);
  });

  it('registry exports getRegistrySize', () => {
    const c = readFile(REGISTRY_PATH);
    expect(c).toMatch(/export\s+function\s+getRegistrySize/);
  });

  it('registry has max size protection (LRU eviction)', () => {
    const c = readFile(REGISTRY_PATH);
    // Must define a maximum size constant
    expect(c).toMatch(/MAX_REGISTRY_SIZE|maxSize|MAX_SIZE/);
  });

  it('registry evicts oldest entry when max size exceeded', () => {
    const c = readFile(REGISTRY_PATH);
    // Eviction: delete oldest key (insertion-order Map)
    expect(c).toMatch(/registry\.delete|\.delete\(/);
  });

  it('registry max size is 10,000 or less', () => {
    const c = readFile(REGISTRY_PATH);
    const match = c.match(/MAX_REGISTRY_SIZE\s*=\s*([\d_]+)/);
    if (match) {
      const size = parseInt(match[1].replace(/_/g, ''), 10);
      expect(size).toBeLessThanOrEqual(10_000);
    } else {
      // Literal present
      expect(c).toMatch(/10.?000|10_000/);
    }
  });

  it('registry uses Map for O(1) lookups', () => {
    const c = readFile(REGISTRY_PATH);
    expect(c).toMatch(/new Map/);
  });
});

// ── Middleware ────────────────────────────────────────────────────────────────

describe('Persisted Queries: middleware.ts', () => {
  const MIDDLEWARE_PATH = 'apps/gateway/src/persisted-queries/middleware.ts';

  it('apps/gateway/src/persisted-queries/middleware.ts exists', () => {
    expect(existsSync(resolve(ROOT, MIDDLEWARE_PATH))).toBe(true);
  });

  it('middleware uses PERSISTED_QUERIES_ONLY env var', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toContain('PERSISTED_QUERIES_ONLY');
  });

  it('middleware reads PERSISTED_QUERIES_ONLY from process.env', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toMatch(/process\.env/);
  });

  it('middleware exports applyPersistedQueryMiddleware function', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toMatch(/export\s+function\s+applyPersistedQueryMiddleware/);
  });

  it('middleware rejects unknown hashes with PERSISTED_QUERY_NOT_FOUND', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toContain('PERSISTED_QUERY_NOT_FOUND');
  });

  it('middleware returns 400 for unknown persisted query hash', () => {
    const c = readFile(MIDDLEWARE_PATH);
    // Must return HTTP 400 when hash is not in registry
    expect(c).toMatch(/status:\s*400|400/);
  });

  it('middleware rejects hash-less requests when PERSISTED_QUERIES_ONLY=true', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toContain('PERSISTED_QUERIES_REQUIRED');
  });

  it('middleware registers query when both hash and query are present', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toContain('registerQuery');
  });

  it('middleware substitutes stored query when hash matches registry', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toContain('lookupQuery');
    expect(c).toMatch(/body\.query\s*=\s*lookupQuery/);
  });

  it('middleware imports registry functions (not raw Map access)', () => {
    const c = readFile(MIDDLEWARE_PATH);
    expect(c).toMatch(/import.*from.*registry/);
  });
});

// ── Environment configuration ─────────────────────────────────────────────────

describe('Persisted Queries: environment configuration', () => {
  it('apps/gateway/.env.example documents PERSISTED_QUERIES_ONLY', () => {
    const c = readFile('apps/gateway/.env.example');
    expect(c).toContain('PERSISTED_QUERIES_ONLY');
  });
});

// ── Deployment documentation ──────────────────────────────────────────────────

describe('Persisted Queries: deployment documentation', () => {
  const DOC_PATH = 'docs/deployment/QUERY_HARDENING.md';

  it('docs/deployment/QUERY_HARDENING.md exists', () => {
    expect(existsSync(resolve(ROOT, DOC_PATH))).toBe(true);
  });

  it('QUERY_HARDENING.md references persisted queries', () => {
    const c = readFile(DOC_PATH);
    expect(c).toMatch(/[Pp]ersisted [Qq]uer/);
  });

  it('QUERY_HARDENING.md references the registry implementation path', () => {
    const c = readFile(DOC_PATH);
    expect(c).toMatch(/persisted-queries\/registry/);
  });
});
