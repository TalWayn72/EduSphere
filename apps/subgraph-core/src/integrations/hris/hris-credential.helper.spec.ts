/**
 * hris-credential.helper.spec.ts — Unit tests for HRIS credential
 * encryption, decryption, and redaction helpers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEncryptField = vi.fn((val: string) => `enc:${val}`);
const mockDecryptField = vi.fn((val: string) => val.replace('enc:', ''));
const mockDeriveTenantKey = vi.fn(() => 'tenant-derived-key');

vi.mock('@edusphere/db', () => ({
  encryptField: (...args: unknown[]) => mockEncryptField(...args),
  decryptField: (...args: unknown[]) => mockDecryptField(...args),
  deriveTenantKey: (...args: unknown[]) => mockDeriveTenantKey(...args),
}));

import {
  encryptHrisCredentials,
  decryptHrisCredentials,
  redactHrisConfig,
} from './hris-credential.helper.js';

interface TestHrisConfig {
  type: string;
  baseUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fieldMapping: Record<string, string>;
}

const BASE_CONFIG: TestHrisConfig = {
  type: 'workday',
  baseUrl: 'https://api.workday.com',
  tenantId: 't-001',
  clientId: 'my-client-id',
  clientSecret: 'my-secret',
  fieldMapping: { email: 'emailAddress', name: 'fullName' },
};

describe('hris-credential.helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encryptHrisCredentials', () => {
    it('encrypts clientId and clientSecret fields', () => {
      const result = encryptHrisCredentials(BASE_CONFIG as never);

      expect(mockDeriveTenantKey).toHaveBeenCalledWith('t-001');
      expect(mockEncryptField).toHaveBeenCalledTimes(2);
      expect(mockEncryptField).toHaveBeenCalledWith('my-client-id', 'tenant-derived-key');
      expect(mockEncryptField).toHaveBeenCalledWith('my-secret', 'tenant-derived-key');
      expect((result as TestHrisConfig).clientId).toBe('enc:my-client-id');
      expect((result as TestHrisConfig).clientSecret).toBe('enc:my-secret');
    });

    it('does not modify non-secret fields', () => {
      const result = encryptHrisCredentials(BASE_CONFIG as never);

      expect((result as TestHrisConfig).type).toBe('workday');
      expect((result as TestHrisConfig).baseUrl).toBe('https://api.workday.com');
      expect((result as TestHrisConfig).tenantId).toBe('t-001');
    });

    it('returns a new object (does not mutate input)', () => {
      const result = encryptHrisCredentials(BASE_CONFIG as never);
      expect(result).not.toBe(BASE_CONFIG);
      expect(BASE_CONFIG.clientId).toBe('my-client-id');
    });

    it('skips encryption for empty/falsy clientId', () => {
      const config = { ...BASE_CONFIG, clientId: '' };
      encryptHrisCredentials(config as never);

      // encryptField should only be called once (for clientSecret)
      expect(mockEncryptField).toHaveBeenCalledTimes(1);
    });

    it('skips encryption for empty/falsy clientSecret', () => {
      const config = { ...BASE_CONFIG, clientSecret: '' };
      encryptHrisCredentials(config as never);

      expect(mockEncryptField).toHaveBeenCalledTimes(1);
    });
  });

  describe('decryptHrisCredentials', () => {
    it('decrypts fields that contain colon (encrypted format)', () => {
      const encrypted = {
        ...BASE_CONFIG,
        clientId: 'iv:encrypted-id',
        clientSecret: 'iv:encrypted-secret',
      };

      const result = decryptHrisCredentials(encrypted as never);

      expect(mockDecryptField).toHaveBeenCalledTimes(2);
      expect((result as TestHrisConfig).clientId).toBeDefined();
      expect((result as TestHrisConfig).clientSecret).toBeDefined();
    });

    it('skips decryption for plaintext values (no colon)', () => {
      const plaintext = { ...BASE_CONFIG };
      decryptHrisCredentials(plaintext as never);

      expect(mockDecryptField).not.toHaveBeenCalled();
    });

    it('handles decryption failure gracefully (corrupt data)', () => {
      mockDecryptField.mockImplementation(() => {
        throw new Error('Bad decrypt');
      });

      const config = {
        ...BASE_CONFIG,
        clientId: 'iv:corrupt-data',
        clientSecret: 'iv:also-corrupt',
      };

      // Should not throw — errors are caught internally
      const result = decryptHrisCredentials(config as never);
      expect(result).toBeDefined();
    });

    it('returns a new object (does not mutate input)', () => {
      const config = { ...BASE_CONFIG, clientId: 'iv:data' };
      const result = decryptHrisCredentials(config as never);
      expect(result).not.toBe(config);
    });
  });

  describe('redactHrisConfig', () => {
    it('replaces clientId and clientSecret with ***', () => {
      const result = redactHrisConfig(BASE_CONFIG as never);

      expect(result['clientId']).toBe('***');
      expect(result['clientSecret']).toBe('***');
    });

    it('preserves non-secret fields', () => {
      const result = redactHrisConfig(BASE_CONFIG as never);

      expect(result['type']).toBe('workday');
      expect(result['baseUrl']).toBe('https://api.workday.com');
      expect(result['tenantId']).toBe('t-001');
      expect(result['fieldMapping']).toEqual({ email: 'emailAddress', name: 'fullName' });
    });

    it('sets clientId to undefined when originally falsy', () => {
      const config = { ...BASE_CONFIG, clientId: '' };
      const result = redactHrisConfig(config as never);
      expect(result['clientId']).toBeUndefined();
    });

    it('sets clientSecret to undefined when originally falsy', () => {
      const config = { ...BASE_CONFIG, clientSecret: '' };
      const result = redactHrisConfig(config as never);
      expect(result['clientSecret']).toBeUndefined();
    });
  });
});
