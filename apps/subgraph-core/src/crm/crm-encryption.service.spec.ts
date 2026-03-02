/**
 * crm-encryption.service.spec.ts — Unit tests for CrmEncryptionService.
 * Pure crypto tests — no external mocking required.
 * SI-3: PII fields (OAuth tokens) must be AES-256-GCM encrypted at rest.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Key setup ─────────────────────────────────────────────────────────────────

// 32-byte key: Buffer.from('a'.repeat(32)) encoded in base64
const VALID_KEY = Buffer.from('a'.repeat(32)).toString('base64');
const SHORT_KEY = Buffer.from('short').toString('base64'); // not 32 bytes

let originalKey: string | undefined;

beforeEach(() => {
  originalKey = process.env['CRM_ENCRYPTION_KEY'];
  process.env['CRM_ENCRYPTION_KEY'] = VALID_KEY;
});

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env['CRM_ENCRYPTION_KEY'];
  } else {
    process.env['CRM_ENCRYPTION_KEY'] = originalKey;
  }
});

// ── Import ────────────────────────────────────────────────────────────────────

import { CrmEncryptionService } from './crm-encryption.service.js';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CrmEncryptionService', () => {
  // 1. encrypt → decrypt round-trip returns original plaintext
  it('encrypt then decrypt returns the original plaintext', () => {
    const svc = new CrmEncryptionService();
    const original = 'my-secret-oauth-token';
    const encrypted = svc.encrypt(original);
    expect(svc.decrypt(encrypted)).toBe(original);
  });

  // 2. encrypt produces 3-part colon-separated format
  it('encrypt output has exactly 3 colon-separated parts', () => {
    const svc = new CrmEncryptionService();
    const parts = svc.encrypt('test').split(':');
    expect(parts).toHaveLength(3);
  });

  // 3. encrypt uses different IV each time
  it('two encryptions of the same plaintext produce different ciphertexts', () => {
    const svc = new CrmEncryptionService();
    const enc1 = svc.encrypt('same-value');
    const enc2 = svc.encrypt('same-value');
    expect(enc1).not.toBe(enc2);
  });

  // 4. decrypt throws on 2-part format
  it('decrypt throws on a 2-part (invalid) format', () => {
    const svc = new CrmEncryptionService();
    expect(() => svc.decrypt('aabbcc:ddeeff')).toThrow(
      'Invalid encrypted token format'
    );
  });

  // 5. decrypt throws when authTag length is wrong
  it('decrypt throws when authTag is not 16 bytes', () => {
    const svc = new CrmEncryptionService();
    // Build a string with valid 3-part structure but a short tag (not 32 hex chars = 16 bytes)
    const badTag = 'aabb'; // only 2 bytes
    const validIv = 'a'.repeat(24); // 12 bytes in hex
    const ciphertext = 'deadbeef';
    expect(() => svc.decrypt(`${validIv}:${badTag}:${ciphertext}`)).toThrow(
      'Invalid auth tag length'
    );
  });

  // 6. constructor throws if CRM_ENCRYPTION_KEY is missing
  it('constructor throws when CRM_ENCRYPTION_KEY is not set', () => {
    delete process.env['CRM_ENCRYPTION_KEY'];
    expect(() => new CrmEncryptionService()).toThrow(
      'CRM_ENCRYPTION_KEY env var is required'
    );
  });

  // 7. constructor throws if key is not 32 bytes
  it('constructor throws when key decodes to fewer than 32 bytes', () => {
    process.env['CRM_ENCRYPTION_KEY'] = SHORT_KEY;
    expect(() => new CrmEncryptionService()).toThrow(
      'CRM_ENCRYPTION_KEY must be 32 bytes'
    );
  });

  // 8. encrypt/decrypt empty string
  it('encrypt and decrypt works for empty string', () => {
    const svc = new CrmEncryptionService();
    expect(svc.decrypt(svc.encrypt(''))).toBe('');
  });

  // 9. encrypt/decrypt with unicode content
  it('encrypt and decrypt preserves unicode content', () => {
    const svc = new CrmEncryptionService();
    const unicode = '日本語テスト 🔐 שלום';
    expect(svc.decrypt(svc.encrypt(unicode))).toBe(unicode);
  });

  // 10. encrypt output contains only valid hex characters between colons
  it('all three parts of the encrypted output are valid hex strings', () => {
    const svc = new CrmEncryptionService();
    const parts = svc.encrypt('anything').split(':');
    const hexPattern = /^[0-9a-f]+$/i;
    for (const part of parts) {
      expect(part).toMatch(hexPattern);
    }
  });
});
