/**
 * Static security tests for PII encryption compliance (SI-3).
 * These tests scan source files to ensure encryption is applied consistently.
 * No database or network access required — runs on every CI push.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('SI-3: PII Encryption Helpers Exist', () => {
  it('encryption helper file exists', () => {
    const path = resolve(ROOT, 'packages/db/src/helpers/encryption.ts');
    expect(existsSync(path)).toBe(true);
  });

  it('encryption helper exports encryptField', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('export function encryptField');
  });

  it('encryption helper exports decryptField', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('export function decryptField');
  });

  it('encryption helper exports deriveTenantKey', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('export function deriveTenantKey');
  });

  it('uses AES-256-GCM algorithm', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('aes-256-gcm');
  });

  it('uses random IV for each encryption', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('randomBytes');
  });

  it('uses authentication tag (GCM integrity)', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('getAuthTag');
    expect(content).toContain('setAuthTag');
  });

  it('reads ENCRYPTION_MASTER_KEY from environment (not hardcoded)', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('ENCRYPTION_MASTER_KEY');
    // Must NOT contain a hardcoded key
    expect(content).not.toMatch(/masterKey\s*=\s*['"`][^'"`]{10,}/);
  });

  it('uses tenant-specific key derivation (HMAC)', () => {
    const content = readFile('packages/db/src/helpers/encryption.ts');
    expect(content).toContain('HMAC');
  });
});

describe('SI-3: Encryption Helper Tests Exist', () => {
  it('encryption.test.ts exists', () => {
    const path = resolve(ROOT, 'packages/db/src/helpers/encryption.test.ts');
    expect(existsSync(path)).toBe(true);
  });

  it('tests cover encrypt/decrypt round-trip', () => {
    const content = readFile('packages/db/src/helpers/encryption.test.ts');
    expect(content).toContain('encrypts and decrypts');
  });

  it('tests cover tamper detection', () => {
    const content = readFile('packages/db/src/helpers/encryption.test.ts');
    expect(content).toContain('tampered');
  });

  it('tests cover wrong key rejection', () => {
    const content = readFile('packages/db/src/helpers/encryption.test.ts');
    expect(content).toContain('wrong key');
  });
});
