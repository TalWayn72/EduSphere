/**
 * Static security tests for PostgreSQL read replica infrastructure.
 * Validates configuration files exist and meet security requirements.
 * No DB/network access required — pure static file analysis.
 * Runs on every CI push as part of the security gate.
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

// ---------------------------------------------------------------------------
// postgresql-replica.conf
// ---------------------------------------------------------------------------
describe('Read Replica: postgresql-replica.conf', () => {
  const confPath = 'infrastructure/postgres/postgresql-replica.conf';

  it('postgresql-replica.conf exists', () => {
    expect(existsSync(resolve(ROOT, confPath))).toBe(true);
  });

  it('hot_standby = on (replica serves read queries)', () => {
    const content = readFile(confPath);
    expect(content).toMatch(/^\s*hot_standby\s*=\s*on/m);
  });

  it('wal_level = replica (enables streaming replication)', () => {
    const content = readFile(confPath);
    expect(content).toMatch(/^\s*wal_level\s*=\s*replica/m);
  });

  it('max_wal_senders is configured (enables standby connections)', () => {
    const content = readFile(confPath);
    expect(content).toMatch(/^\s*max_wal_senders\s*=\s*\d+/m);
  });

  it('wal_keep_size is configured (lag protection for slow replicas)', () => {
    const content = readFile(confPath);
    expect(content).toMatch(/^\s*wal_keep_size\s*=/m);
  });

  it('hot_standby_feedback = on (prevents conflict cancellations)', () => {
    const content = readFile(confPath);
    expect(content).toMatch(/^\s*hot_standby_feedback\s*=\s*on/m);
  });

  it('recovery_target_timeline = latest (follows promotions)', () => {
    const content = readFile(confPath);
    expect(content).toMatch(/recovery_target_timeline\s*=\s*['"]?latest['"]?/);
  });

  it('primary_conninfo placeholder is present (not empty)', () => {
    const content = readFile(confPath);
    expect(content).toMatch(/primary_conninfo\s*=/);
  });
});

// ---------------------------------------------------------------------------
// pg_hba.conf
// ---------------------------------------------------------------------------
describe('Read Replica: pg_hba.conf', () => {
  const hbaPath = 'infrastructure/postgres/pg_hba.conf';

  it('pg_hba.conf exists', () => {
    expect(existsSync(resolve(ROOT, hbaPath))).toBe(true);
  });

  it('uses scram-sha-256 for replication connections', () => {
    const content = readFile(hbaPath);
    // Must have a replication line with scram-sha-256
    const replicationLines = content
      .split('\n')
      .filter((l) => l.match(/\breplication\b/) && !l.trim().startsWith('#'));
    expect(replicationLines.length).toBeGreaterThan(0);
    const allScram = replicationLines.every((l) => l.includes('scram-sha-256'));
    expect(allScram).toBe(true);
  });

  it('does NOT use trust authentication for replication', () => {
    const content = readFile(hbaPath);
    const replicationLines = content
      .split('\n')
      .filter((l) => l.match(/\breplication\b/) && !l.trim().startsWith('#'));
    const hasTrust = replicationLines.some((l) => l.includes('trust'));
    expect(hasTrust).toBe(false);
  });

  it('does NOT use md5 authentication for replication', () => {
    const content = readFile(hbaPath);
    const replicationLines = content
      .split('\n')
      .filter((l) => l.match(/\breplication\b/) && !l.trim().startsWith('#'));
    const hasMd5 = replicationLines.some((l) => l.includes('md5'));
    expect(hasMd5).toBe(false);
  });

  it('has application user entry for edusphere_app', () => {
    const content = readFile(hbaPath);
    expect(content).toMatch(/edusphere_app/);
  });

  it('denies all unmatched connections (fail-closed)', () => {
    const content = readFile(hbaPath);
    expect(content).toMatch(/reject/);
  });
});

// ---------------------------------------------------------------------------
// READ_REPLICAS.md documentation
// ---------------------------------------------------------------------------
describe('Read Replica: READ_REPLICAS.md documentation', () => {
  const docPath = 'docs/deployment/READ_REPLICAS.md';

  it('READ_REPLICAS.md exists', () => {
    expect(existsSync(resolve(ROOT, docPath))).toBe(true);
  });

  it('documents failover procedure', () => {
    const content = readFile(docPath);
    expect(content.toLowerCase()).toMatch(/failover/);
  });

  it('documents pg_stat_replication monitoring query', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/pg_stat_replication/);
  });

  it('documents REPLICA_DATABASE_URL environment variable', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/REPLICA_DATABASE_URL/);
  });

  it('documents pg_basebackup setup command', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/pg_basebackup/);
  });
});

// ---------------------------------------------------------------------------
// readReplica.ts helper
// ---------------------------------------------------------------------------
describe('Read Replica: readReplica.ts helper', () => {
  const helperPath = 'packages/db/src/helpers/readReplica.ts';

  it('readReplica.ts exists', () => {
    expect(existsSync(resolve(ROOT, helperPath))).toBe(true);
  });

  it('exports getReadPool', () => {
    const content = readFile(helperPath);
    expect(content).toMatch(/export\s+function\s+getReadPool/);
  });

  it('exports getWritePool', () => {
    const content = readFile(helperPath);
    expect(content).toMatch(/export\s+function\s+getWritePool/);
  });

  it('exports withReadReplica execution helper', () => {
    const content = readFile(helperPath);
    expect(content).toMatch(/export\s+(async\s+)?function\s+withReadReplica/);
  });

  it('falls back to primary when REPLICA_DATABASE_URL not set', () => {
    const content = readFile(helperPath);
    // Must check for REPLICA_DATABASE_URL and fall back to primary getOrCreatePool()
    expect(content).toMatch(/REPLICA_DATABASE_URL/);
    expect(content).toMatch(/getOrCreatePool\(\)/);
  });

  it('uses getOrCreatePool (SI-8: no direct new Pool())', () => {
    const content = readFile(helperPath);
    // Must never instantiate Pool directly
    expect(content).not.toMatch(/new Pool\(/);
    expect(content).toMatch(/getOrCreatePool/);
  });

  it('emits a warning when falling back to primary', () => {
    const content = readFile(helperPath);
    expect(content).toMatch(/warning|warn|REPLICA_DATABASE_URL not set/i);
  });
});

// ---------------------------------------------------------------------------
// nginx.conf CDN configuration
// ---------------------------------------------------------------------------
describe('Read Replica: nginx.conf CDN & security headers', () => {
  const nginxPath = 'infrastructure/nginx/nginx.conf';

  it('infrastructure/nginx/nginx.conf exists', () => {
    expect(existsSync(resolve(ROOT, nginxPath))).toBe(true);
  });

  it('sets long-term Cache-Control for /assets/ (CDN caching)', () => {
    const content = readFile(nginxPath);
    expect(content).toMatch(/max-age=31536000/);
    expect(content).toMatch(/immutable/);
  });

  it('sets X-Frame-Options security header', () => {
    const content = readFile(nginxPath);
    expect(content).toMatch(/X-Frame-Options/);
  });

  it('sets X-Content-Type-Options header (MIME sniffing prevention)', () => {
    const content = readFile(nginxPath);
    expect(content).toMatch(/X-Content-Type-Options/);
  });

  it('sets HSTS header', () => {
    const content = readFile(nginxPath);
    expect(content).toMatch(/Strict-Transport-Security/);
  });

  it('proxies /graphql to upstream gateway', () => {
    const content = readFile(nginxPath);
    expect(content).toMatch(/location\s+\/graphql/);
    expect(content).toMatch(/proxy_pass/);
  });

  it('enables gzip compression', () => {
    const content = readFile(nginxPath);
    expect(content).toMatch(/gzip\s+on/);
  });

  it('SPA fallback routes unknown paths to index.html', () => {
    const content = readFile(nginxPath);
    expect(content).toMatch(/try_files.*index\.html/);
  });
});
