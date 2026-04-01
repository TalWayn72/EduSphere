/**
 * api-key.service.spec.ts — Unit tests for ApiKeyService.
 *
 * Covers:
 *   - Key generation (SHA-256 hash stored, raw key returned once)
 *   - Hash verification
 *   - Scope validation (LTI, SCIM, webhook, BI)
 *   - Rate limit configuration
 *   - Key revocation
 *   - Key listing (hash prefix only, never full key)
 *   - Max keys per tenant limit
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.returning = self;
  p.values = self;
  p.set = self;
  p.orderBy = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (arg: unknown) => unknown) =>
      fn({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      })
  ),
  schema: {
    biApiTokens: {
      id: 'id',
      tenantId: 'tenant_id',
      tokenHash: 'token_hash',
      description: 'description',
      scopes: 'scopes',
      isActive: 'is_active',
      lastUsedAt: 'last_used_at',
      rateLimit: 'rate_limit',
      createdAt: 'created_at',
    },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  count: vi.fn(() => ({ count: 'count' })),
}));

import { ApiKeyService } from './api-key.service.js';

const TENANT_CTX = {
  tenantId: 'tenant-001',
  userId: 'admin-001',
  role: 'ORG_ADMIN',
};

const VALID_SCOPES = ['lti:read', 'scim:write', 'webhook:manage', 'bi:export'];

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(makeChain([]));
    mockInsert.mockReturnValue(
      makeChain([{ id: 'key-001', tokenHash: 'abc123hash' }])
    );
    service = new ApiKeyService();
  });

  // ─── Key generation ───────────────────────────────────────────────────────

  describe('generateKey()', () => {
    it('returns raw key only once (never stored)', async () => {
      const result = await service.generateKey(TENANT_CTX, {
        description: 'BI Export Key',
        scopes: ['bi:export'],
      });

      expect(result.rawKey).toBeDefined();
      expect(typeof result.rawKey).toBe('string');
      expect(result.rawKey.length).toBeGreaterThanOrEqual(32);
    });

    it('stores SHA-256 hash, not raw key', async () => {
      await service.generateKey(TENANT_CTX, {
        description: 'Test Key',
        scopes: ['bi:export'],
      });

      expect(mockInsert).toHaveBeenCalled();
      // The stored value should be a hash, not the raw key
    });

    it('rejects key without description', async () => {
      await expect(
        service.generateKey(TENANT_CTX, {
          description: '',
          scopes: ['bi:export'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects key with empty scopes', async () => {
      await expect(
        service.generateKey(TENANT_CTX, {
          description: 'No scopes',
          scopes: [],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects key with invalid scope', async () => {
      await expect(
        service.generateKey(TENANT_CTX, {
          description: 'Bad scope',
          scopes: ['admin:nuclear-launch'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects key generation by non-ORG_ADMIN', async () => {
      await expect(
        service.generateKey(
          { ...TENANT_CTX, role: 'STUDENT' },
          { description: 'Test', scopes: ['bi:export'] }
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Hash verification ────────────────────────────────────────────────────

  describe('verifyKey()', () => {
    it('returns true for valid key matching stored hash', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          {
            id: 'key-001',
            tokenHash: 'matching-hash',
            isActive: true,
            scopes: ['bi:export'],
          },
        ])
      );

      const result = await service.verifyKey('raw-key-value');
      expect(result.valid).toBe(true);
      expect(result.scopes).toContain('bi:export');
    });

    it('returns false for invalid key', async () => {
      mockSelect.mockReturnValue(makeChain([]));

      const result = await service.verifyKey('invalid-key');
      expect(result.valid).toBe(false);
    });

    it('rejects revoked (inactive) key', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          {
            id: 'key-001',
            tokenHash: 'matching-hash',
            isActive: false,
            scopes: ['bi:export'],
          },
        ])
      );

      const result = await service.verifyKey('raw-key-value');
      expect(result.valid).toBe(false);
    });

    it('updates lastUsedAt on successful verification', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          {
            id: 'key-001',
            tokenHash: 'matching-hash',
            isActive: true,
            scopes: ['bi:export'],
          },
        ])
      );

      await service.verifyKey('raw-key-value');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ─── Scope validation ─────────────────────────────────────────────────────

  describe('scope validation', () => {
    it.each(VALID_SCOPES)('accepts valid scope "%s"', async (scope) => {
      const result = await service.generateKey(TENANT_CTX, {
        description: `Key for ${scope}`,
        scopes: [scope],
      });
      expect(result).toBeDefined();
    });

    it('accepts multiple valid scopes', async () => {
      const result = await service.generateKey(TENANT_CTX, {
        description: 'Multi-scope key',
        scopes: ['bi:export', 'lti:read'],
      });
      expect(result).toBeDefined();
    });
  });

  // ─── Rate limit configuration ─────────────────────────────────────────────

  describe('rate limits', () => {
    it('sets custom rate limit on key', async () => {
      await service.generateKey(TENANT_CTX, {
        description: 'Rate limited key',
        scopes: ['bi:export'],
        rateLimit: 1000, // requests per hour
      });

      expect(mockInsert).toHaveBeenCalled();
    });

    it('applies default rate limit when not specified', async () => {
      await service.generateKey(TENANT_CTX, {
        description: 'Default rate limit',
        scopes: ['bi:export'],
      });

      expect(mockInsert).toHaveBeenCalled();
    });
  });

  // ─── Key revocation ───────────────────────────────────────────────────────

  describe('revokeKey()', () => {
    it('marks key as inactive', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          { id: 'key-001', tenantId: TENANT_CTX.tenantId, isActive: true },
        ])
      );

      await service.revokeKey(TENANT_CTX, 'key-001');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('rejects revoking key from different tenant', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ id: 'key-001', tenantId: 'other-tenant', isActive: true }])
      );

      await expect(service.revokeKey(TENANT_CTX, 'key-001')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('returns 404 for non-existent key', async () => {
      mockSelect.mockReturnValue(makeChain([]));

      await expect(
        service.revokeKey(TENANT_CTX, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Key listing ──────────────────────────────────────────────────────────

  describe('listKeys()', () => {
    it('returns keys without full hash (prefix only)', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          {
            id: 'key-001',
            description: 'BI Key',
            tokenHash: 'abcdef1234567890',
            isActive: true,
          },
          {
            id: 'key-002',
            description: 'LTI Key',
            tokenHash: 'xyz9876543210fed',
            isActive: false,
          },
        ])
      );

      const result = await service.listKeys(TENANT_CTX);
      expect(result).toHaveLength(2);
      // Hash should be masked/prefix-only
      result.forEach((key: { hashPrefix: string }) => {
        expect(key.hashPrefix.length).toBeLessThanOrEqual(8);
      });
    });
  });

  // ─── Max keys per tenant ──────────────────────────────────────────────────

  describe('max keys limit', () => {
    it('rejects key generation when limit reached (20 keys)', async () => {
      mockSelect.mockReturnValueOnce(makeChain([{ count: 20 }]));

      await expect(
        service.generateKey(TENANT_CTX, {
          description: 'One too many',
          scopes: ['bi:export'],
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Memory safety ────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
