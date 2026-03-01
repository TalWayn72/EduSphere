import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: { openBadgeDefinitions: {} },
}));

vi.mock('@edusphere/auth', () => ({}));

import { OpenBadgeResolver } from './open-badge.resolver.js';
import type { OpenBadgeService } from './open-badge.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockGetUserBadges = vi.fn();
const mockGetBadgeDefinitions = vi.fn();
const mockVerifyCredential = vi.fn();
const mockCreateBadgeDefinition = vi.fn();
const mockIssueCredential = vi.fn();
const mockRevokeCredential = vi.fn();

const mockService = {
  getUserBadges: mockGetUserBadges,
  getBadgeDefinitions: mockGetBadgeDefinitions,
  verifyCredential: mockVerifyCredential,
  createBadgeDefinition: mockCreateBadgeDefinition,
  issueCredential: mockIssueCredential,
  revokeCredential: mockRevokeCredential,
} as unknown as OpenBadgeService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = { userId: 'user-1', tenantId: 'tenant-1', roles: ['STUDENT'] };
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const MOCK_ASSERTION = {
  id: 'assertion-1',
  badgeDefinitionId: 'def-1',
  userId: 'user-1',
  issuedOn: '2026-01-01T00:00:00.000Z',
  evidenceUrl: null,
  credentialJson: {},
};

const MOCK_DEFINITION = {
  id: 'def-1',
  tenantId: 'tenant-1',
  name: 'SQL Expert',
  description: 'Mastered SQL',
  imageUrl: null,
  criteriaUrl: null,
  tags: [],
  createdAt: new Date('2026-01-01'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OpenBadgeResolver', () => {
  let resolver: OpenBadgeResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new OpenBadgeResolver(mockService);
  });

  // ── requireAuth ────────────────────────────────────────────────────────────

  describe('requireAuth (tested via myBadges)', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(resolver.myBadges(noAuthCtx)).rejects.toThrow(UnauthorizedException);
      expect(mockGetUserBadges).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = makeCtx({ userId: undefined as unknown as string, tenantId: 't1', roles: [] });
      await expect(resolver.myBadges(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({ userId: 'u1', tenantId: undefined as unknown as string, roles: [] });
      await expect(resolver.myBadges(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── myBadges ──────────────────────────────────────────────────────────────

  describe('myBadges()', () => {
    it('delegates to service.getUserBadges with userId and tenantId', async () => {
      mockGetUserBadges.mockResolvedValueOnce([MOCK_ASSERTION]);

      const result = await resolver.myBadges(makeCtx());

      expect(mockGetUserBadges).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual([MOCK_ASSERTION]);
    });

    it('returns empty array when user has no badges', async () => {
      mockGetUserBadges.mockResolvedValueOnce([]);
      const result = await resolver.myBadges(makeCtx());
      expect(result).toEqual([]);
    });
  });

  // ── badgeDefinitions ──────────────────────────────────────────────────────

  describe('badgeDefinitions()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(resolver.badgeDefinitions(noAuthCtx)).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.getBadgeDefinitions with tenantId', async () => {
      mockGetBadgeDefinitions.mockResolvedValueOnce([MOCK_DEFINITION]);

      const result = await resolver.badgeDefinitions(makeCtx());

      expect(mockGetBadgeDefinitions).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual([MOCK_DEFINITION]);
    });
  });

  // ── verifyBadge ──────────────────────────────────────────────────────────

  describe('verifyBadge()', () => {
    it('does NOT require authentication — calls service directly', async () => {
      mockVerifyCredential.mockResolvedValueOnce({ valid: true, assertion: MOCK_ASSERTION });

      const result = await resolver.verifyBadge('assertion-1');

      expect(mockVerifyCredential).toHaveBeenCalledWith('assertion-1');
      expect(result).toEqual({ valid: true, assertion: MOCK_ASSERTION });
    });

    it('returns valid:false with error when assertion is invalid', async () => {
      mockVerifyCredential.mockResolvedValueOnce({ valid: false, error: 'Assertion not found' });

      const result = await resolver.verifyBadge('bad-assertion-id');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Assertion not found');
    });
  });

  // ── issueBadge ───────────────────────────────────────────────────────────

  describe('issueBadge()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.issueBadge('target-user', 'def-1', undefined, noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.issueCredential with correct payload', async () => {
      mockIssueCredential.mockResolvedValueOnce(MOCK_ASSERTION);

      const result = await resolver.issueBadge(
        'target-user',
        'def-1',
        'https://evidence.example.com',
        makeCtx()
      );

      expect(mockIssueCredential).toHaveBeenCalledWith({
        userId: 'target-user',
        badgeDefinitionId: 'def-1',
        tenantId: 'tenant-1',
        evidenceUrl: 'https://evidence.example.com',
      });
      expect(result).toEqual(MOCK_ASSERTION);
    });
  });

  // ── createBadgeDefinition ────────────────────────────────────────────────

  describe('createBadgeDefinition()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.createBadgeDefinition('SQL Expert', 'Desc', undefined, undefined, undefined, noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.createBadgeDefinition with correct input', async () => {
      mockCreateBadgeDefinition.mockResolvedValueOnce(MOCK_DEFINITION);

      const result = await resolver.createBadgeDefinition(
        'SQL Expert',
        'Mastered SQL',
        'https://img.example.com/badge.png',
        'https://criteria.example.com',
        ['sql', 'database'],
        makeCtx()
      );

      expect(mockCreateBadgeDefinition).toHaveBeenCalledWith(
        {
          name: 'SQL Expert',
          description: 'Mastered SQL',
          imageUrl: 'https://img.example.com/badge.png',
          criteriaUrl: 'https://criteria.example.com',
          tags: ['sql', 'database'],
        },
        'tenant-1'
      );
      expect(result).toEqual(MOCK_DEFINITION);
    });
  });

  // ── revokeBadge ──────────────────────────────────────────────────────────

  describe('revokeBadge()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.revokeBadge('assertion-1', 'Violation', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('calls service.revokeCredential and returns true', async () => {
      mockRevokeCredential.mockResolvedValueOnce(undefined);

      const result = await resolver.revokeBadge('assertion-1', 'Policy violation', makeCtx());

      expect(mockRevokeCredential).toHaveBeenCalledWith('assertion-1', 'Policy violation', 'tenant-1');
      expect(result).toBe(true);
    });
  });
});
