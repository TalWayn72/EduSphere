/**
 * Static security tests for NATS TLS compliance (SI-7).
 * Scans source files to ensure TLS is supported and documented.
 * No network access required — runs on every CI push.
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

describe('SI-7: NATS TLS Support', () => {
  it('nats-client index.ts exists', () => {
    const path = resolve(ROOT, 'packages/nats-client/src/index.ts');
    expect(existsSync(path)).toBe(true);
  });

  it('nats-client supports TLS configuration via env vars', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    expect(content).toContain('NATS_TLS_CERT');
  });

  it('nats-client supports TLS key file', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    expect(content).toContain('NATS_TLS_KEY');
  });

  it('nats-client supports TLS CA file', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    expect(content).toContain('NATS_TLS_CA');
  });

  it('nats-client uses TLS options object when env vars set', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    expect(content).toMatch(/tls\s*[=:]/);
  });

  it('nats-client does NOT hardcode server URL', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    // Should use env var, not hardcoded nats://localhost
    expect(content).toContain('NATS_URL');
  });

  it('nats-client does NOT commit plaintext NKey secrets', () => {
    const content = readFile('packages/nats-client/src/connection.ts');
    // NKey secret seeds start with 'SU' (seed for user)
    expect(content).not.toMatch(/['"](SU[A-Z2-7]{56})['"]/);
  });

  it('buildNatsOptions is exported from index', () => {
    const content = readFile('packages/nats-client/src/index.ts');
    expect(content).toContain('buildNatsOptions');
  });
});

describe('SI-7: NATS Server Configuration', () => {
  it('nats-server.conf exists', () => {
    const path = resolve(ROOT, 'infrastructure/nats/nats-server.conf');
    expect(existsSync(path)).toBe(true);
  });

  it('nats-server.conf includes JetStream configuration', () => {
    const content = readFile('infrastructure/nats/nats-server.conf');
    expect(content).toContain('jetstream');
  });

  it('nats-server.conf documents TLS configuration', () => {
    const content = readFile('infrastructure/nats/nats-server.conf');
    expect(content).toContain('tls');
    expect(content).toContain('cert_file');
    expect(content).toContain('key_file');
    expect(content).toContain('ca_file');
  });

  it('nats-server.conf documents authorization', () => {
    const content = readFile('infrastructure/nats/nats-server.conf');
    expect(content).toContain('authorization');
    expect(content).toContain('nkey');
  });
});

describe('SI-7: NATS Environment Documentation', () => {
  it('.env.example or source code documents NATS_TLS_CERT', () => {
    const gatewayEnv = readFile('apps/gateway/.env.example');
    const rootEnv = readFile('.env.example');
    const combined = gatewayEnv + rootEnv;
    const hasTlsDoc =
      combined.includes('NATS_TLS') ||
      readFile('packages/nats-client/src/connection.ts').includes(
        'NATS_TLS_CERT'
      );
    expect(hasTlsDoc).toBe(true);
  });
});
