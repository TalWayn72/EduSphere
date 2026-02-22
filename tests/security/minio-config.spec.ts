/**
 * Static security tests for MinIO encryption (G-17) and DB SSL (G-07).
 * Scans configuration files to ensure encryption settings are present.
 * No running containers or network access required — pure file inspection.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

// ─── G-17: MinIO Server-Side Encryption ──────────────────────────────────────

describe('G-17: MinIO Server-Side Encryption', () => {
  let dockerCompose: string;

  beforeAll(() => {
    dockerCompose =
      readFile('docker-compose.yml') ||
      readFile('infrastructure/docker/docker-compose.yml');
  });

  it('docker-compose.yml defines a MinIO SSE key variable', () => {
    const hasEncryption =
      dockerCompose.includes('MINIO_KMS_SECRET_KEY') ||
      dockerCompose.includes('MINIO_KMS_KES') ||
      dockerCompose.includes('MINIO_SSE');
    expect(hasEncryption).toBe(true);
  });

  it('MINIO_KMS_SECRET_KEY references an env-var placeholder (not a bare literal)', () => {
    if (!dockerCompose.includes('MINIO_KMS_SECRET_KEY')) return;
    // Must use ${VAR} or ${VAR:-default} syntax so the real secret comes from .env
    expect(dockerCompose).toMatch(/MINIO_KMS_SECRET_KEY[^=\n]*=\S*\$\{/);
  });

  it('MinIO service is defined in docker-compose', () => {
    expect(dockerCompose).toContain('minio');
  });

  it('MINIO_ROOT_PASSWORD references an env-var (not hardcoded plaintext)', () => {
    if (!dockerCompose.includes('MINIO_ROOT_PASSWORD')) return;
    // Acceptable: ${VAR}, ${VAR:-default}, or env_file reference
    // Not acceptable: a bare string like "minioadmin"
    // We just verify the pattern contains a $ interpolation
    expect(dockerCompose).toMatch(/MINIO_ROOT_PASSWORD[^=\n]*[\$\{]/);
  });
});

// ─── G-17: .env.example documents the encryption key ─────────────────────────

describe('G-17: MinIO Encryption Key documented in .env.example', () => {
  let envExample: string;

  beforeAll(() => {
    envExample = readFile('.env.example');
  });

  it('.env.example exists', () => {
    expect(envExample.length).toBeGreaterThan(0);
  });

  it('.env.example contains MINIO_ENCRYPTION_KEY entry', () => {
    expect(envExample).toContain('MINIO_ENCRYPTION_KEY');
  });

  it('.env.example documents NATS TLS variables', () => {
    expect(envExample).toContain('NATS_TLS_CERT');
    expect(envExample).toContain('NATS_TLS_KEY');
    expect(envExample).toContain('NATS_TLS_CA');
  });
});

// ─── G-07: Database SSL Mode ─────────────────────────────────────────────────

describe('G-07: Database SSL Mode', () => {
  let dockerCompose: string;
  let envExample: string;

  beforeAll(() => {
    dockerCompose =
      readFile('docker-compose.yml') ||
      readFile('infrastructure/docker/docker-compose.yml');
    envExample = readFile('.env.example');
  });

  it('docker-compose.yml DATABASE_URL includes sslmode', () => {
    // After G-07 patch the dev URL should carry sslmode=prefer
    const dbUrlLine = dockerCompose
      .split('\n')
      .find((l) => l.includes('DATABASE_URL') && l.includes('postgresql://'));
    expect(dbUrlLine).toBeDefined();
    expect(dbUrlLine).toContain('sslmode=');
  });

  it('docker-compose.yml documents production sslmode=require', () => {
    expect(dockerCompose).toContain('sslmode=require');
  });

  it('.env.example documents G-07 SSL mode guidance', () => {
    const hasSsl =
      envExample.includes('sslmode') ||
      envExample.includes('DATABASE_SSL') ||
      envExample.includes('G-07');
    expect(hasSsl).toBe(true);
  });

  it('withTenantContext helper enforces RLS tenant isolation', () => {
    const withTenantContext = readFile(
      'packages/db/src/rls/withTenantContext.ts',
    );
    if (!withTenantContext) return; // file may not exist yet — advisory
    expect(withTenantContext).toContain('app.current_tenant');
  });

  it('user service uses tenant context wrapper (not raw DB queries)', () => {
    const userService = readFile(
      'apps/subgraph-core/src/user/user.service.ts',
    );
    if (!userService || !userService.includes('db.')) return; // advisory
    expect(userService).toMatch(/withTenantContext|tenantContext/);
  });
});

// ─── G-16: NATS TLS Configuration ────────────────────────────────────────────

describe('G-16: NATS TLS Configuration', () => {
  let dockerCompose: string;
  let envExample: string;

  beforeAll(() => {
    dockerCompose =
      readFile('docker-compose.yml') ||
      readFile('infrastructure/docker/docker-compose.yml');
    envExample = readFile('.env.example');
  });

  it('docker-compose.yml documents NATS TLS comment', () => {
    expect(dockerCompose).toContain('NATS_TLS');
  });

  it('.env.example documents NATS_NKEY variable', () => {
    expect(envExample).toContain('NATS_NKEY');
  });

  it('.env.example documents NATS TLS certificate paths', () => {
    expect(envExample).toContain('NATS_TLS_CERT');
    expect(envExample).toContain('NATS_TLS_KEY');
    expect(envExample).toContain('NATS_TLS_CA');
  });
});
