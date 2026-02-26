/**
 * Static security tests for cryptographic inventory compliance.
 * SOC2 CC6.1, CC6.7: Encryption at rest and in transit.
 * GDPR Art.32: Appropriate technical measures.
 * ISO 27001 A.10: Cryptography policy.
 * No DB/network required -- pure static file analysis.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

// ── CRYPTO_INVENTORY.md ─────────────────────────────────────────────────────

describe('CRYPTO_INVENTORY.md -- Cryptographic Implementation Inventory', () => {
  const content = readFile('docs/security/CRYPTO_INVENTORY.md');

  it('docs/security/CRYPTO_INVENTORY.md exists', () => {
    expect(existsSync(resolve(ROOT, 'docs/security/CRYPTO_INVENTORY.md'))).toBe(
      true
    );
  });

  it('documents AES-256-GCM for PII field encryption', () => {
    expect(content).toMatch(/AES-256-GCM/);
  });

  it('specifies 12-byte random IV per encryption call', () => {
    expect(content).toMatch(/12 bytes|randomBytes/i);
  });

  it('documents HMAC-SHA256 key derivation', () => {
    expect(content).toMatch(/HMAC-SHA256/);
  });

  it('documents TLS 1.3 as minimum for transport', () => {
    expect(content).toMatch(/TLS 1.3/);
  });

  it('documents RS256 JWT signing', () => {
    expect(content).toMatch(/RS256/);
  });

  it('documents SCRAM-SHA-256 for PgBouncer', () => {
    expect(content).toMatch(/SCRAM-SHA-256/);
  });

  it('marks MD5 as FORBIDDEN', () => {
    expect(content).toMatch(/MD5.*FORBIDDEN|FORBIDDEN.*MD5/);
  });

  it('marks SHA-1 as FORBIDDEN', () => {
    expect(content).toMatch(/SHA-1.*FORBIDDEN|FORBIDDEN.*SHA-1/);
  });

  it('marks 3DES as FORBIDDEN', () => {
    expect(content).toMatch(/3DES.*FORBIDDEN|FORBIDDEN.*3DES/);
  });

  it('marks TLS 1.0 as FORBIDDEN', () => {
    expect(content).toMatch(/TLS 1.0.*FORBIDDEN|FORBIDDEN.*TLS 1.0/);
  });

  it('marks TLS 1.1 as FORBIDDEN', () => {
    expect(content).toMatch(/TLS 1.1.*FORBIDDEN|FORBIDDEN.*TLS 1.1/);
  });

  it('marks AES-ECB as FORBIDDEN', () => {
    expect(content).toMatch(/AES-ECB.*FORBIDDEN|FORBIDDEN.*AES-ECB/);
  });

  it('marks RC4 as FORBIDDEN', () => {
    expect(content).toMatch(/RC4.*FORBIDDEN|FORBIDDEN.*RC4/);
  });

  it('defines key rotation schedule', () => {
    expect(content).toMatch(/[Rr]otation/);
  });

  it('references encryption.ts implementation', () => {
    expect(content).toMatch(/encryption.ts/);
  });

  it('references pgbouncer.ini for SCRAM-SHA-256', () => {
    expect(content).toMatch(/pgbouncer.ini/);
  });

  it('references NATS connection.ts with NKey', () => {
    expect(content).toMatch(/connection.ts|NKey|nkeyAuthenticator/);
  });

  it('includes compliance mapping for GDPR Art.32', () => {
    expect(content).toMatch(/GDPR Art.32/);
  });

  it('includes SOC2 CC6.1 and CC6.7 compliance mapping', () => {
    expect(content).toMatch(/SOC2 CC6.1/);
    expect(content).toMatch(/SOC2 CC6.7/);
  });

  it('references SI-3 PII encryption invariant', () => {
    expect(content).toMatch(/SI-3/);
  });

  it('references SI-7 NATS TLS invariant', () => {
    expect(content).toMatch(/SI-7/);
  });
});

// ── Encryption implementation ─────────────────────────────────────────────

describe('Encryption Implementation (packages/db/src/helpers/encryption.ts)', () => {
  const content = readFile('packages/db/src/helpers/encryption.ts');

  it('encryption.ts exists', () => {
    expect(
      existsSync(resolve(ROOT, 'packages/db/src/helpers/encryption.ts'))
    ).toBe(true);
  });

  it('uses aes-256-gcm algorithm', () => {
    expect(content).toMatch(/aes-256-gcm/i);
  });

  it('generates random IV per encryption call', () => {
    expect(content).toMatch(/randomBytes/);
  });

  it('specifies IV_LENGTH of 12 bytes', () => {
    expect(content).toMatch(/IV_LENGTH.*12|12.*IV_LENGTH/);
  });

  it('verifies auth tag on decryption (tamper prevention)', () => {
    expect(content).toMatch(/getAuthTag|setAuthTag/);
  });

  it('exports encryptField function', () => {
    expect(content).toMatch(
      /export.*function encryptField|export.*encryptField/
    );
  });

  it('exports decryptField function', () => {
    expect(content).toMatch(
      /export.*function decryptField|export.*decryptField/
    );
  });

  it('exports deriveTenantKey function', () => {
    expect(content).toMatch(
      /export.*function deriveTenantKey|export.*deriveTenantKey/
    );
  });
});

// ── PgBouncer SCRAM-SHA-256 ─────────────────────────────────────────────

describe('PgBouncer Cryptography (infrastructure/pgbouncer/pgbouncer.ini)', () => {
  const content = readFile('infrastructure/pgbouncer/pgbouncer.ini');

  it('pgbouncer.ini uses scram-sha-256 auth_type', () => {
    expect(content).toMatch(/auth_type\s*=\s*scram-sha-256/);
  });

  it('does not use md5 auth_type (deprecated in PostgreSQL 16)', () => {
    expect(content).not.toMatch(/auth_type\s*=\s*md5/);
  });
});

// ── NATS TLS + NKey ─────────────────────────────────────────────────────

describe('NATS Cryptography (packages/nats-client/src/connection.ts)', () => {
  const content = readFile('packages/nats-client/src/connection.ts');

  it('connection.ts exists', () => {
    expect(
      existsSync(resolve(ROOT, 'packages/nats-client/src/connection.ts'))
    ).toBe(true);
  });

  it('uses TLS options for NATS connection', () => {
    expect(content).toMatch(/tls|TLS/);
  });

  it('uses nkeyAuthenticator for NATS authentication', () => {
    expect(content).toMatch(/nkeyAuthenticator|authenticator/);
  });

  it('exports buildNatsOptions function', () => {
    expect(content).toMatch(/buildNatsOptions/);
  });
});

// ── docs/security/MODEL_CARDS.md EU AI Act ──────────────────────────────

describe('MODEL_CARDS.md -- EU AI Act Art.53 (docs/security/)', () => {
  const content = readFile('docs/security/MODEL_CARDS.md');

  it('docs/security/MODEL_CARDS.md exists', () => {
    expect(existsSync(resolve(ROOT, 'docs/security/MODEL_CARDS.md'))).toBe(
      true
    );
  });

  it('references EU AI Act transparency requirements', () => {
    expect(content).toMatch(/EU AI Act|Art.50|Art.53/);
  });

  it('documents AI agent types', () => {
    expect(content).toMatch(/Agent|agent/);
  });

  it('includes data retention information', () => {
    expect(content).toMatch(/[Rr]etention/);
  });

  it('documents high-risk classification', () => {
    expect(content).toMatch(/[Hh]igh.?[Rr]isk/);
  });

  it('documents human oversight requirements', () => {
    expect(content).toMatch(/[Hh]uman [Oo]versight|oversight/i);
  });

  it('includes opt-out information (GDPR right to object)', () => {
    expect(content).toMatch(/[Oo]pt.?[Oo]ut|opt out/i);
  });
});
