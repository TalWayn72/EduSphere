import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  withTenantContext: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
}));

import { XapiResolver } from './xapi.resolver.js';
import type { XapiTokenService } from './xapi-token.service.js';
import type { XapiStatementService } from './xapi-statement.service.js';

// ── Mock services ─────────────────────────────────────────────────────────────

const mockListTokens = vi.fn();
const mockGenerateToken = vi.fn();
const mockRevokeToken = vi.fn();

const mockTokenService = {
  listTokens: mockListTokens,
  generateToken: mockGenerateToken,
  revokeToken: mockRevokeToken,
} as unknown as XapiTokenService;

const mockQueryStatements = vi.fn();

const mockStatementService = {
  queryStatements: mockQueryStatements,
} as unknown as XapiStatementService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['ORG_ADMIN'],
};
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const MOCK_TOKEN = {
  id: 'token-1',
  tenantId: 'tenant-1',
  description: 'LRS integration',
  lrsEndpoint: 'https://lrs.example.com',
  tokenHash: 'hashed-secret',
  createdAt: new Date('2026-01-01'),
  revokedAt: null,
};

const MOCK_STATEMENT_ROW = {
  id: 'stmt-1',
  verb: {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { en: 'completed' },
  },
  object: {
    id: 'http://example.com/activities/course-1',
    objectType: 'Activity',
  },
  stored: '2026-01-15T08:00:00.000Z',
  actor: { mbox: 'mailto:user@example.com' },
  tenantId: 'tenant-1',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('XapiResolver', () => {
  let resolver: XapiResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new XapiResolver(mockTokenService, mockStatementService);
  });

  // ── xapiTokens ────────────────────────────────────────────────────────────

  describe('xapiTokens()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(resolver.xapiTokens(noAuthCtx)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockListTokens).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(resolver.xapiTokens(ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('delegates to tokenService.listTokens with tenantId', async () => {
      mockListTokens.mockResolvedValueOnce([MOCK_TOKEN]);

      const result = await resolver.xapiTokens(makeCtx());

      expect(mockListTokens).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual([MOCK_TOKEN]);
    });

    it('returns empty array when no tokens exist', async () => {
      mockListTokens.mockResolvedValueOnce([]);
      const result = await resolver.xapiTokens(makeCtx());
      expect(result).toEqual([]);
    });
  });

  // ── xapiStatements ────────────────────────────────────────────────────────

  describe('xapiStatements()', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.xapiStatements(10, undefined, noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(resolver.xapiStatements(10, undefined, ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('maps verb.id, object.id, and stored to storedAt in returned shape', async () => {
      mockQueryStatements.mockResolvedValueOnce([MOCK_STATEMENT_ROW]);

      const result = await resolver.xapiStatements(10, undefined, makeCtx());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'stmt-1',
        verb: 'http://adlnet.gov/expapi/verbs/completed',
        objectId: 'http://example.com/activities/course-1',
        storedAt: '2026-01-15T08:00:00.000Z',
      });
    });

    it('passes limit and since filters to statementService', async () => {
      mockQueryStatements.mockResolvedValueOnce([]);

      await resolver.xapiStatements(25, '2026-01-01T00:00:00.000Z', makeCtx());

      expect(mockQueryStatements).toHaveBeenCalledWith('tenant-1', {
        limit: 25,
        since: '2026-01-01T00:00:00.000Z',
      });
    });

    it('returns empty array when no statements match', async () => {
      mockQueryStatements.mockResolvedValueOnce([]);
      const result = await resolver.xapiStatements(
        undefined,
        undefined,
        makeCtx()
      );
      expect(result).toEqual([]);
    });

    it('uses current ISO date as storedAt fallback when stored is undefined', async () => {
      const rowWithoutStored = { ...MOCK_STATEMENT_ROW, stored: undefined };
      mockQueryStatements.mockResolvedValueOnce([rowWithoutStored]);

      const result = await resolver.xapiStatements(10, undefined, makeCtx());

      expect(result[0]!.storedAt).toBeDefined();
      // Should be a valid ISO date string
      expect(() => new Date(result[0]!.storedAt)).not.toThrow();
    });
  });

  // ── generateXapiToken ─────────────────────────────────────────────────────

  describe('generateXapiToken()', () => {
    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(
        resolver.generateXapiToken(
          'Integration',
          'https://lrs.example.com',
          ctx
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to tokenService.generateToken and returns raw token string', async () => {
      mockGenerateToken.mockResolvedValueOnce('raw-secret-token-string');

      const result = await resolver.generateXapiToken(
        'LRS integration',
        'https://lrs.example.com',
        makeCtx()
      );

      expect(mockGenerateToken).toHaveBeenCalledWith(
        'tenant-1',
        'LRS integration',
        'https://lrs.example.com'
      );
      expect(result).toBe('raw-secret-token-string');
    });
  });

  // ── revokeXapiToken ───────────────────────────────────────────────────────

  describe('revokeXapiToken()', () => {
    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(resolver.revokeXapiToken('token-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('delegates to tokenService.revokeToken with tokenId and tenantId', async () => {
      mockRevokeToken.mockResolvedValueOnce(true);

      const result = await resolver.revokeXapiToken('token-1', makeCtx());

      expect(mockRevokeToken).toHaveBeenCalledWith('token-1', 'tenant-1');
      expect(result).toBe(true);
    });
  });
});
