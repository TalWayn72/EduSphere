import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenBadgesService } from './open-badges.service.js';
import { NotFoundException } from '@nestjs/common';

// Mock the @edusphere/db module
vi.mock('@edusphere/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return {
    db: mockDb,
    openBadgeDefinitions: { id: 'id', tenantId: 'tenantId', name: 'name', description: 'description', issuerId: 'issuerId', criteriaUrl: 'criteriaUrl', imageUrl: 'imageUrl', createdAt: 'createdAt', tags: 'tags', version: 'version', badgeDefinitionId: 'badgeDefinitionId' },
    openBadgeAssertions: { id: 'id', badgeDefinitionId: 'badgeDefinitionId', recipientId: 'recipientId', tenantId: 'tenantId', issuedAt: 'issuedAt', expiresAt: 'expiresAt', evidenceUrl: 'evidenceUrl', proof: 'proof', revoked: 'revoked', revokedAt: 'revokedAt', revokedReason: 'revokedReason' },
    eq: vi.fn((a, b) => ({ field: a, value: b })),
    and: vi.fn((...args) => args),
  };
});

const mockDef = {
  id: 'def-1',
  tenantId: 'tenant-1',
  name: 'First Badge',
  description: 'Complete first course',
  imageUrl: null,
  criteriaUrl: 'https://example.com/criteria',
  tags: [],
  version: '3.0',
  issuerId: 'did:example:issuer',
  createdAt: new Date('2024-01-01'),
};

const mockAssertion = {
  id: 'assert-1',
  badgeDefinitionId: 'def-1',
  recipientId: 'user-1',
  tenantId: 'tenant-1',
  issuedAt: new Date('2024-06-01'),
  expiresAt: null,
  evidenceUrl: null,
  proof: { type: 'DataIntegrityProof', proofValue: 'abc123', cryptosuite: 'hmac-sha256', created: '2024-06-01T00:00:00.000Z', verificationMethod: 'urn:edusphere:hmac-key-1', proofPurpose: 'assertionMethod' },
  revoked: false,
  revokedAt: null,
  revokedReason: null,
};

import { db } from '@edusphere/db';

describe('OpenBadgesService', () => {
  let service: OpenBadgesService;

  beforeEach(() => {
    service = new OpenBadgesService();
    vi.clearAllMocks();
  });

  describe('issueBadge', () => {
    it('should throw NotFoundException if badge definition not found', async () => {
      const mockDb = db as ReturnType<typeof vi.fn> & typeof db;
      (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.issueBadge('bad-def-id', 'user-1', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should create assertion with HMAC proof when definition found', async () => {
      const mockDb = db as ReturnType<typeof vi.fn> & typeof db;
      let callCount = 0;
      (mockDb.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            return callCount === 1 ? [mockDef] : [];
          }),
        }),
      }));

      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAssertion]),
        }),
      });

      const result = await service.issueBadge('def-1', 'user-1', 'tenant-1');
      expect(result.badgeDefinitionId).toBe('def-1');
      expect(result.recipientId).toBe('user-1');
    });
  });

  describe('revokeOpenBadge', () => {
    it('should mark assertion as revoked', async () => {
      const mockDb = db as ReturnType<typeof vi.fn> & typeof db;
      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      });

      const result = await service.revokeOpenBadge('assert-1', 'tenant-1', 'User request');
      expect(result).toBe(true);
    });
  });

  describe('verifyOpenBadge', () => {
    it('should return false for revoked badge', async () => {
      const mockDb = db as ReturnType<typeof vi.fn> & typeof db;
      (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ ...mockAssertion, revoked: true }]),
        }),
      });

      const result = await service.verifyOpenBadge('assert-1');
      expect(result).toBe(false);
    });

    it('should return false for unknown assertion', async () => {
      const mockDb = db as ReturnType<typeof vi.fn> & typeof db;
      (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.verifyOpenBadge('bad-id');
      expect(result).toBe(false);
    });
  });
});
