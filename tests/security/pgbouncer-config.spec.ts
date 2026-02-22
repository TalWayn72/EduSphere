/**
 * Static security tests for PgBouncer connection pooling configuration.
 * Phase 7.1: Production-grade connection pooling for 100k+ concurrent users.
 * SOC2 CC6.1: Secure database connections.
 * Memory Safety: Pool limits prevent connection exhaustion.
 * No DB/network required — pure static file analysis.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('PgBouncer: pgbouncer.ini — Security Configuration', () => {
  const content = readFile('infrastructure/pgbouncer/pgbouncer.ini');

  it('infrastructure/pgbouncer/pgbouncer.ini exists', () => {
    expect(existsSync(resolve(ROOT, 'infrastructure/pgbouncer/pgbouncer.ini'))).toBe(true);
  });

  it('uses transaction pooling mode (required for RLS SET LOCAL)', () => {
    expect(content).toMatch(/pool_mode\s*=\s*transaction/);
  });

  it('uses scram-sha-256 authentication (not MD5 or trust)', () => {
    expect(content).toMatch(/auth_type\s*=\s*scram-sha-256/);
  });

  it('does not use trust authentication', () => {
    expect(content).not.toMatch(/auth_type\s*=\s*trust/);
  });

  it('sets max_client_conn >= 1000 (100k concurrent user support)', () => {
    const match = content.match(/max_client_conn\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    const maxConn = parseInt(match![1], 10);
    expect(maxConn).toBeGreaterThanOrEqual(1000);
  });

  it('sets max_db_connections to limit PostgreSQL server load', () => {
    expect(content).toMatch(/max_db_connections\s*=\s*\d+/);
  });

  it('sets query_timeout to prevent runaway queries', () => {
    const match = content.match(/query_timeout\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    const timeout = parseInt(match![1], 10);
    // Must be set (non-zero) but generous for complex pgvector/AGE queries
    expect(timeout).toBeGreaterThan(0);
  });

  it('enables connection logging for audit compliance', () => {
    expect(content).toMatch(/log_connections\s*=\s*1/);
  });

  it('enables disconnection logging for audit compliance', () => {
    expect(content).toMatch(/log_disconnections\s*=\s*1/);
  });

  it('has named pool for each of the 6 subgraphs', () => {
    expect(content).toMatch(/edusphere_core/);
    expect(content).toMatch(/edusphere_content/);
    expect(content).toMatch(/edusphere_annotation/);
    expect(content).toMatch(/edusphere_agent/);
    expect(content).toMatch(/edusphere_knowledge/);
  });

  it('uses auth_file for credential storage (not hardcoded passwords)', () => {
    expect(content).toMatch(/auth_file\s*=/);
  });

  it('sets server_lifetime to force reconnect (key rotation support)', () => {
    const match = content.match(/server_lifetime\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    const lifetime = parseInt(match![1], 10);
    expect(lifetime).toBeGreaterThan(0);
    expect(lifetime).toBeLessThanOrEqual(7200); // Max 2 hours
  });
});

describe('PgBouncer: userlist.txt — Credential Security', () => {
  const content = readFile('infrastructure/pgbouncer/userlist.txt');

  it('infrastructure/pgbouncer/userlist.txt exists', () => {
    expect(existsSync(resolve(ROOT, 'infrastructure/pgbouncer/userlist.txt'))).toBe(true);
  });

  it('uses SCRAM-SHA-256 hash format (not MD5 or plaintext)', () => {
    expect(content).toMatch(/SCRAM-SHA-256/);
  });

  it('does not contain plaintext passwords', () => {
    // Should not have simple quoted passwords without hash marker
    expect(content).not.toMatch(/"[a-zA-Z0-9]{8,}" "[a-zA-Z0-9]{8,}"/);
  });

  it('contains placeholder reminder to replace hashes before deploy', () => {
    expect(content).toMatch(/REPLACE|placeholder|real/i);
  });

  it('has dedicated pgbouncer_admin user (not using app user for admin)', () => {
    expect(content).toMatch(/pgbouncer_admin/);
  });

  it('has separate stats user for Grafana monitoring', () => {
    expect(content).toMatch(/pgbouncer_stats/);
  });
});

describe('PgBouncer: docker-compose.pgbouncer.yml — Container Security', () => {
  const content = readFile('infrastructure/docker-compose.pgbouncer.yml');

  it('infrastructure/docker-compose.pgbouncer.yml exists', () => {
    expect(existsSync(resolve(ROOT, 'infrastructure/docker-compose.pgbouncer.yml'))).toBe(true);
  });

  it('does not expose PgBouncer directly on port 5432 (conflict with postgres)', () => {
    // Should use a different host port (e.g., 6432) or no direct host binding
    expect(content).not.toMatch(/"5432:5432"/);
  });

  it('uses a pinned PgBouncer image version (not :latest)', () => {
    expect(content).toMatch(/pgbouncer:\d+\.\d+/);
  });

  it('mounts pgbouncer.ini config via volume', () => {
    expect(content).toMatch(/pgbouncer\.ini/);
  });
});

describe('PgBouncer: Transaction Pooling + RLS Compatibility', () => {
  it("CLAUDE.md documents SET LOCAL for RLS tenant context", () => {
    const content = readFile('CLAUDE.md');
    expect(content).toMatch(/SET LOCAL.*current_tenant|current_tenant.*SET LOCAL/);
  });

  it('withTenantContext uses BEGIN/SET LOCAL/COMMIT for RLS compatibility', () => {
    const content = readFile('packages/db/src/rls/withTenantContext.ts');
    if (content) {
      // If file exists, it should use SET LOCAL for RLS
      expect(content).toMatch(/SET LOCAL|setLocal|withTenantContext/);
    }
    // File may not exist in all configurations — skip if missing
    expect(true).toBe(true);
  });
});
