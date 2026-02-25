import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  deriveTenantKey,
  encryptField,
  decryptField,
  encryptFieldNullable,
  decryptFieldNullable,
} from './encryption.js';

const TEST_MASTER_KEY = 'test-master-key-32-chars-minimum!!';
const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeAll(() => {
  process.env['ENCRYPTION_MASTER_KEY'] = TEST_MASTER_KEY;
});

afterAll(() => {
  delete process.env['ENCRYPTION_MASTER_KEY'];
});

describe('deriveTenantKey', () => {
  it('returns a 32-byte buffer', () => {
    const key = deriveTenantKey(TEST_TENANT_ID);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('returns different keys for different tenants', () => {
    const key1 = deriveTenantKey('tenant-1');
    const key2 = deriveTenantKey('tenant-2');
    expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
  });

  it('returns the same key for the same tenant (deterministic)', () => {
    const key1 = deriveTenantKey(TEST_TENANT_ID);
    const key2 = deriveTenantKey(TEST_TENANT_ID);
    expect(key1.toString('hex')).toBe(key2.toString('hex'));
  });

  it('throws if ENCRYPTION_MASTER_KEY is not set', () => {
    const saved = process.env['ENCRYPTION_MASTER_KEY'];
    delete process.env['ENCRYPTION_MASTER_KEY'];
    expect(() => deriveTenantKey(TEST_TENANT_ID)).toThrow('ENCRYPTION_MASTER_KEY');
    process.env['ENCRYPTION_MASTER_KEY'] = saved;
  });

  it('throws if ENCRYPTION_MASTER_KEY is too short', () => {
    process.env['ENCRYPTION_MASTER_KEY'] = 'short';
    expect(() => deriveTenantKey(TEST_TENANT_ID)).toThrow('ENCRYPTION_MASTER_KEY');
    process.env['ENCRYPTION_MASTER_KEY'] = TEST_MASTER_KEY;
  });
});

describe('encryptField / decryptField', () => {
  const tenantKey = Buffer.alloc(32, 'k'); // deterministic test key

  it('encrypts and decrypts a string correctly', () => {
    const plaintext = 'test@example.com';
    const encrypted = encryptField(plaintext, tenantKey);
    const decrypted = decryptField(encrypted, tenantKey);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const plaintext = 'same-email@example.com';
    const enc1 = encryptField(plaintext, tenantKey);
    const enc2 = encryptField(plaintext, tenantKey);
    expect(enc1).not.toBe(enc2);
  });

  it('ciphertext is not the same as plaintext', () => {
    const plaintext = 'user@example.com';
    const encrypted = encryptField(plaintext, tenantKey);
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted).not.toBe(plaintext);
  });

  it('encrypted format has three colon-separated parts', () => {
    const encrypted = encryptField('test', tenantKey);
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV: 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag: 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
  });

  it('throws on tampered ciphertext (auth tag failure)', () => {
    const encrypted = encryptField('sensitive-data', tenantKey);
    const parts = encrypted.split(':');
    // XOR the last byte with 0xff to guarantee the byte value changes
    const hex = parts[2]!;
    const lastByte = parseInt(hex.slice(-2), 16) ^ 0xff;
    const tamperedHex = hex.slice(0, -2) + lastByte.toString(16).padStart(2, '0');
    const tampered = `${parts[0]}:${parts[1]}:${tamperedHex}`;
    expect(() => decryptField(tampered, tenantKey)).toThrow();
  });

  it('throws on wrong key', () => {
    const encrypted = encryptField('sensitive-data', tenantKey);
    const wrongKey = Buffer.alloc(32, 'x');
    expect(() => decryptField(encrypted, wrongKey)).toThrow();
  });

  it('throws on malformed ciphertext', () => {
    expect(() => decryptField('not-valid-format', tenantKey)).toThrow(
      'Invalid encrypted field format',
    );
  });

  it('encrypts empty string', () => {
    const encrypted = encryptField('', tenantKey);
    const decrypted = decryptField(encrypted, tenantKey);
    expect(decrypted).toBe('');
  });

  it('encrypts unicode / special characters', () => {
    const plaintext = 'שלום עולם — 你好世界 — €100';
    const encrypted = encryptField(plaintext, tenantKey);
    const decrypted = decryptField(encrypted, tenantKey);
    expect(decrypted).toBe(plaintext);
  });
});

describe('encryptFieldNullable / decryptFieldNullable', () => {
  const tenantKey = Buffer.alloc(32, 'k');

  it('returns null for null input', () => {
    expect(encryptFieldNullable(null, tenantKey)).toBeNull();
    expect(decryptFieldNullable(null, tenantKey)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(encryptFieldNullable(undefined, tenantKey)).toBeNull();
    expect(decryptFieldNullable(undefined, tenantKey)).toBeNull();
  });

  it('encrypts and decrypts non-null values', () => {
    const encrypted = encryptFieldNullable('test@example.com', tenantKey);
    expect(encrypted).not.toBeNull();
    const decrypted = decryptFieldNullable(encrypted, tenantKey);
    expect(decrypted).toBe('test@example.com');
  });
});
