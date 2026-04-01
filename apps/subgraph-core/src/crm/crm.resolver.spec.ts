/**
 * crm.resolver.spec.ts — Unit tests for CrmResolver.
 *
 * Covers the authContext→header fallback pattern introduced when migrating
 * from `ctx.req.headers['x-tenant-id']` to `ctx.authContext?.tenantId`.
 *
 * Test matrix:
 *  1. authContext.tenantId preferred when present
 *  2. x-tenant-id header fallback when authContext missing
 *  3. Returns null/empty when no tenant context at all
 *  4. Regression guard: old ctx.req.user?.tenant_id does NOT work
 *  5. Service delegation with correct tenantId
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {},
  withTenantContext: vi.fn((_db: unknown, _ctx: unknown, fn: () => unknown) =>
    fn()
  ),
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { CrmResolver } from './crm.resolver.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CONN = {
  id: 'conn-1',
  provider: 'SALESFORCE',
  instanceUrl: 'https://myorg.salesforce.com',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const SYNC_ENTRY = {
  id: 'log-1',
  operation: 'COMPLETION_SYNC',
  externalId: 'act-1',
  status: 'SUCCESS',
  errorMessage: null,
  createdAt: new Date('2026-02-01T00:00:00Z'),
};

function makeCrmService(overrides: Record<string, unknown> = {}) {
  return {
    getConnection: vi.fn().mockResolvedValue(null),
    getSyncLog: vi.fn().mockResolvedValue([]),
    disconnectCrm: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** Build context with authContext (JWT-extracted tenant). */
function makeAuthCtx(tenantId?: string): GraphQLContext {
  return {
    req: { headers: {} },
    authContext: tenantId
      ? {
          tenantId,
          userId: 'jwt-user',
          email: 'a@b.com',
          roles: ['ORG_ADMIN'],
          scopes: [],
        }
      : undefined,
  } as unknown as GraphQLContext;
}

/** Build context with x-tenant-id header only (no JWT/authContext). */
function makeHeaderCtx(tenantId?: string): GraphQLContext {
  return {
    req: {
      headers: tenantId ? { 'x-tenant-id': tenantId } : {},
    },
  } as unknown as GraphQLContext;
}

/** Build context with BOTH authContext and header (authContext should win). */
function makeDualCtx(
  authTenantId: string,
  headerTenantId: string
): GraphQLContext {
  return {
    req: { headers: { 'x-tenant-id': headerTenantId } },
    authContext: {
      tenantId: authTenantId,
      userId: 'jwt-user',
      email: 'a@b.com',
      roles: ['ORG_ADMIN'],
      scopes: [],
    },
  } as unknown as GraphQLContext;
}

/** Build empty context — no authContext, no headers. */
function makeEmptyCtx(): GraphQLContext {
  return { req: { headers: {} } } as unknown as GraphQLContext;
}

/** Regression: old pattern with ctx.req.user?.tenant_id */
function makeOldPatternCtx(tenantId: string): GraphQLContext {
  return {
    req: {
      headers: {},
      user: { tenant_id: tenantId },
    },
  } as unknown as GraphQLContext;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CrmResolver', () => {
  let resolver: CrmResolver;
  let mockService: ReturnType<typeof makeCrmService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = makeCrmService();
    resolver = new CrmResolver(mockService as never);
  });

  // ── extractTenantId: authContext preferred ─────────────────────────────────

  describe('extractTenantId — authContext preferred', () => {
    it('crmConnection uses authContext.tenantId when present', async () => {
      mockService.getConnection.mockResolvedValue(CONN);
      await resolver.crmConnection(makeAuthCtx('tenant-jwt'));
      expect(mockService.getConnection).toHaveBeenCalledWith('tenant-jwt');
    });

    it('crmSyncLog uses authContext.tenantId when present', async () => {
      mockService.getSyncLog.mockResolvedValue([SYNC_ENTRY]);
      await resolver.crmSyncLog(makeAuthCtx('tenant-jwt'), 5);
      expect(mockService.getSyncLog).toHaveBeenCalledWith('tenant-jwt', 5);
    });

    it('disconnectCrm uses authContext.tenantId when present', async () => {
      await resolver.disconnectCrm(makeAuthCtx('tenant-jwt'));
      expect(mockService.disconnectCrm).toHaveBeenCalledWith('tenant-jwt');
    });

    it('prefers authContext.tenantId over x-tenant-id header', async () => {
      mockService.getConnection.mockResolvedValue(CONN);
      await resolver.crmConnection(makeDualCtx('jwt-tenant', 'header-tenant'));
      expect(mockService.getConnection).toHaveBeenCalledWith('jwt-tenant');
    });
  });

  // ── extractTenantId: header fallback ──────────────────────────────────────

  describe('extractTenantId — header fallback', () => {
    it('crmConnection falls back to x-tenant-id header', async () => {
      mockService.getConnection.mockResolvedValue(CONN);
      await resolver.crmConnection(makeHeaderCtx('header-t'));
      expect(mockService.getConnection).toHaveBeenCalledWith('header-t');
    });

    it('crmSyncLog falls back to x-tenant-id header', async () => {
      mockService.getSyncLog.mockResolvedValue([]);
      await resolver.crmSyncLog(makeHeaderCtx('header-t'), 10);
      expect(mockService.getSyncLog).toHaveBeenCalledWith('header-t', 10);
    });

    it('disconnectCrm falls back to x-tenant-id header', async () => {
      await resolver.disconnectCrm(makeHeaderCtx('header-t'));
      expect(mockService.disconnectCrm).toHaveBeenCalledWith('header-t');
    });

    it('handles x-tenant-id as string array (takes first element)', async () => {
      const ctx = {
        req: { headers: { 'x-tenant-id': ['arr-tenant', 'ignored'] } },
      } as unknown as GraphQLContext;
      mockService.getConnection.mockResolvedValue(CONN);
      await resolver.crmConnection(ctx);
      expect(mockService.getConnection).toHaveBeenCalledWith('arr-tenant');
    });
  });

  // ── extractTenantId: no tenant context ────────────────────────────────────

  describe('extractTenantId — no tenant context', () => {
    it('crmConnection returns null when no authContext and no header', async () => {
      const result = await resolver.crmConnection(makeEmptyCtx());
      expect(result).toBeNull();
      expect(mockService.getConnection).not.toHaveBeenCalled();
    });

    it('crmSyncLog returns [] when no tenant context', async () => {
      const result = await resolver.crmSyncLog(makeEmptyCtx(), 10);
      expect(result).toEqual([]);
      expect(mockService.getSyncLog).not.toHaveBeenCalled();
    });

    it('disconnectCrm returns false when no tenant context', async () => {
      const result = await resolver.disconnectCrm(makeEmptyCtx());
      expect(result).toBe(false);
      expect(mockService.disconnectCrm).not.toHaveBeenCalled();
    });

    it('returns null when authContext exists but tenantId is undefined', async () => {
      const ctx = {
        req: { headers: {} },
        authContext: {
          userId: 'u1',
          email: 'a@b.com',
          roles: ['STUDENT'],
          scopes: [],
        },
      } as unknown as GraphQLContext;
      const result = await resolver.crmConnection(ctx);
      expect(result).toBeNull();
      expect(mockService.getConnection).not.toHaveBeenCalled();
    });
  });

  // ── Regression guard: old ctx.req.user?.tenant_id does NOT work ───────────

  describe('regression guard — old pattern ctx.req.user?.tenant_id', () => {
    it('crmConnection does NOT extract tenantId from ctx.req.user.tenant_id', async () => {
      const result = await resolver.crmConnection(makeOldPatternCtx('old-t'));
      expect(result).toBeNull();
      expect(mockService.getConnection).not.toHaveBeenCalled();
    });

    it('crmSyncLog does NOT extract tenantId from ctx.req.user.tenant_id', async () => {
      const result = await resolver.crmSyncLog(makeOldPatternCtx('old-t'), 5);
      expect(result).toEqual([]);
      expect(mockService.getSyncLog).not.toHaveBeenCalled();
    });

    it('disconnectCrm does NOT extract tenantId from ctx.req.user.tenant_id', async () => {
      const result = await resolver.disconnectCrm(makeOldPatternCtx('old-t'));
      expect(result).toBe(false);
      expect(mockService.disconnectCrm).not.toHaveBeenCalled();
    });
  });

  // ── Service delegation with correct tenantId ──────────────────────────────

  describe('service delegation', () => {
    it('crmConnection returns null when service returns null', async () => {
      mockService.getConnection.mockResolvedValue(null);
      const result = await resolver.crmConnection(makeAuthCtx('tenant-1'));
      expect(result).toBeNull();
    });

    it('crmConnection returns mapped object with ISO createdAt', async () => {
      mockService.getConnection.mockResolvedValue(CONN);
      const result = (await resolver.crmConnection(
        makeAuthCtx('tenant-1')
      )) as Record<string, unknown>;
      expect(result).not.toBeNull();
      expect(result?.['id']).toBe('conn-1');
      expect(result?.['provider']).toBe('SALESFORCE');
      expect(result?.['createdAt']).toBe(CONN.createdAt.toISOString());
    });

    it('crmSyncLog maps entries with ISO createdAt', async () => {
      mockService.getSyncLog.mockResolvedValue([SYNC_ENTRY]);
      const result = (await resolver.crmSyncLog(
        makeAuthCtx('tenant-1'),
        5
      )) as Record<string, unknown>[];
      expect(result).toHaveLength(1);
      expect(result[0]?.['createdAt']).toBe(SYNC_ENTRY.createdAt.toISOString());
      expect(result[0]?.['operation']).toBe('COMPLETION_SYNC');
    });

    it('crmSyncLog defaults limit to 20 when not provided', async () => {
      mockService.getSyncLog.mockResolvedValue([]);
      await resolver.crmSyncLog(makeAuthCtx('tenant-1'));
      expect(mockService.getSyncLog).toHaveBeenCalledWith('tenant-1', 20);
    });

    it('disconnectCrm delegates to service and returns true', async () => {
      const result = await resolver.disconnectCrm(makeAuthCtx('tenant-1'));
      expect(result).toBe(true);
      expect(mockService.disconnectCrm).toHaveBeenCalledWith('tenant-1');
    });
  });
});
