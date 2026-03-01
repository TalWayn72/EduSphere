import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  withTenantContext: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
}));
vi.mock('@edusphere/auth', () => ({}));

import { BiExportResolver } from './bi-export.resolver.js';
import type { BiTokenService } from './bi-token.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockListTokens = vi.fn();
const mockGenerateToken = vi.fn();
const mockRevokeToken = vi.fn();

const mockTokenService = {
  listTokens: mockListTokens,
  generateToken: mockGenerateToken,
  revokeToken: mockRevokeToken,
} as unknown as BiTokenService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeCtx = (roles: string[] = ['ORG_ADMIN']) => ({
  req: {},
  authContext: { userId: 'admin-1', tenantId: 't1', roles },
});

const noAuthCtx = { req: {}, authContext: undefined };

const TOKEN_ROW = {
  id: 'tok-1',
  description: 'Power BI connector',
  isActive: true,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  lastUsedAt: new Date('2026-02-15T08:30:00.000Z'),
};

const TOKEN_ROW_NULL_USED = {
  id: 'tok-2',
  description: 'Tableau connector',
  isActive: true,
  createdAt: new Date('2026-01-10T09:00:00.000Z'),
  lastUsedAt: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BiExportResolver', () => {
  let resolver: BiExportResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new BiExportResolver(mockTokenService);
  });

  // ── requireAdmin ─────────────────────────────────────────────────────────────

  describe('requireAdmin (tested via getBiApiTokens)', () => {
    it('throws UnauthorizedException when no auth', async () => {
      await expect(resolver.getBiApiTokens(noAuthCtx)).rejects.toThrow(UnauthorizedException);
      expect(mockListTokens).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = { req: {}, authContext: { userId: undefined as unknown as string, tenantId: 't1', roles: ['ORG_ADMIN'] } };
      await expect(resolver.getBiApiTokens(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException for INSTRUCTOR role', async () => {
      await expect(
        resolver.getBiApiTokens(makeCtx(['INSTRUCTOR']))
      ).rejects.toThrow(ForbiddenException);
      expect(mockListTokens).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for STUDENT role', async () => {
      await expect(
        resolver.getBiApiTokens(makeCtx(['STUDENT']))
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ORG_ADMIN role', async () => {
      mockListTokens.mockResolvedValueOnce([]);
      await expect(resolver.getBiApiTokens(makeCtx(['ORG_ADMIN']))).resolves.not.toThrow();
    });

    it('allows SUPER_ADMIN role', async () => {
      mockListTokens.mockResolvedValueOnce([]);
      await expect(resolver.getBiApiTokens(makeCtx(['SUPER_ADMIN']))).resolves.not.toThrow();
    });
  });

  // ── getBiApiTokens ────────────────────────────────────────────────────────────

  describe('getBiApiTokens', () => {
    it('maps createdAt to ISO string', async () => {
      mockListTokens.mockResolvedValueOnce([TOKEN_ROW]);

      const result = await resolver.getBiApiTokens(makeCtx());

      expect(result[0]!.createdAt).toBe('2026-01-01T10:00:00.000Z');
    });

    it('maps lastUsedAt to ISO string when present', async () => {
      mockListTokens.mockResolvedValueOnce([TOKEN_ROW]);

      const result = await resolver.getBiApiTokens(makeCtx());

      expect(result[0]!.lastUsedAt).toBe('2026-02-15T08:30:00.000Z');
    });

    it('maps lastUsedAt to null when absent', async () => {
      mockListTokens.mockResolvedValueOnce([TOKEN_ROW_NULL_USED]);

      const result = await resolver.getBiApiTokens(makeCtx());

      expect(result[0]!.lastUsedAt).toBeNull();
    });

    it('calls listTokens with tenantId from auth', async () => {
      mockListTokens.mockResolvedValueOnce([]);

      await resolver.getBiApiTokens(makeCtx());

      expect(mockListTokens).toHaveBeenCalledWith('t1');
    });
  });

  // ── generateBIApiKey ──────────────────────────────────────────────────────────

  describe('generateBIApiKey', () => {
    it('returns raw token string from service', async () => {
      mockGenerateToken.mockResolvedValueOnce('abc123rawtoken');

      const result = await resolver.generateBIApiKey('Test token', makeCtx());

      expect(result).toBe('abc123rawtoken');
      expect(mockGenerateToken).toHaveBeenCalledWith('t1', 'Test token');
    });

    it('throws UnauthorizedException when no auth', async () => {
      await expect(
        resolver.generateBIApiKey('desc', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── revokeBIApiKey ────────────────────────────────────────────────────────────

  describe('revokeBIApiKey', () => {
    it('calls revokeToken and returns true', async () => {
      mockRevokeToken.mockResolvedValueOnce(undefined);

      const result = await resolver.revokeBIApiKey('tok-1', makeCtx());

      expect(result).toBe(true);
      expect(mockRevokeToken).toHaveBeenCalledWith('tok-1', 't1');
    });

    it('throws ForbiddenException for non-admin role', async () => {
      await expect(
        resolver.revokeBIApiKey('tok-1', makeCtx(['INSTRUCTOR']))
      ).rejects.toThrow(ForbiddenException);
      expect(mockRevokeToken).not.toHaveBeenCalled();
    });
  });
});
