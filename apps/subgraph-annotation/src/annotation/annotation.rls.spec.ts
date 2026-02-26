import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationService } from './annotation.service';
import type { AuthContext } from '@edusphere/auth';

// ─── Capture withTenantContext call arguments ─────────────────────────────
const capturedContexts: Array<{
  tenantId: string;
  userId: string;
  userRole: string;
}> = [];

const mockReturning = vi.fn();
const mockLimit = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockFrom = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockTx = {
  select: () => ({ from: mockFrom }),
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    annotations: {
      id: 'id',
      asset_id: 'asset_id',
      user_id: 'user_id',
      layer: 'layer',
      deleted_at: 'deleted_at',
      tenant_id: 'tenant_id',
      created_at: 'created_at',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => ({ desc: col })),
  sql: Object.assign(
    vi.fn((str) => str),
    { placeholder: vi.fn() }
  ),
  withTenantContext: vi.fn(async (_db, ctx, callback) => {
    capturedContexts.push({ ...ctx });
    return callback(mockTx);
  }),
  closeAllPools: vi.fn(),
}));

import { withTenantContext } from '@edusphere/db';

const tenantAAuth: AuthContext = {
  userId: 'user-a',
  email: 'a@a.com',
  username: 'userA',
  tenantId: 'tenant-A',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};
const tenantBAuth: AuthContext = {
  userId: 'user-b',
  email: 'b@b.com',
  username: 'userB',
  tenantId: 'tenant-B',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};
const MOCK_ANNOTATION = {
  id: 'ann-1',
  asset_id: 'asset-1',
  user_id: 'user-a',
  tenant_id: 'tenant-A',
  layer: 'PERSONAL',
  content: { text: 'hi' },
  is_resolved: false,
  deleted_at: null,
  created_at: new Date(),
};

describe('AnnotationService — RLS tenant isolation', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedContexts.length = 0;
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
      returning: mockReturning,
    });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    service = new AnnotationService();
  });

  describe('listAnnotations — tenant isolation', () => {
    it('calls withTenantContext with tenantId from AuthContext, not from input', async () => {
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
      });
      await service.findAll({ limit: 10, offset: 0 }, tenantAAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-A', userId: 'user-a' }),
        expect.any(Function)
      );
    });

    it('returns empty array when wrong tenant context is used (isolation)', async () => {
      // withTenantContext for tenant-B returns no tenant-A rows (RLS enforces this)
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
      });
      const result = await service.findAll(
        { limit: 10, offset: 0 },
        tenantBAuth
      );
      expect(Array.isArray(result)).toBe(true);
      const capturedTenant = capturedContexts[0]?.tenantId;
      expect(capturedTenant).toBe('tenant-B');
      // tenant-B context is passed — DB RLS would filter out tenant-A rows
    });

    it('cross-tenant: user-b context never requests tenant-A data', async () => {
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          offset: vi.fn().mockResolvedValue([MOCK_ANNOTATION]),
        }),
      });
      await service.findAll({ limit: 10, offset: 0 }, tenantBAuth);
      const ctx = capturedContexts[0];
      expect(ctx.tenantId).toBe('tenant-B');
      expect(ctx.tenantId).not.toBe('tenant-A');
    });
  });

  describe('createAnnotation — tenantId from AuthContext', () => {
    it('sets tenantId from AuthContext, not from client input', async () => {
      mockReturning.mockResolvedValue([MOCK_ANNOTATION]);
      await service.create(
        {
          assetId: 'asset-1',
          annotationType: 'TEXT',
          layer: 'PERSONAL',
          content: { text: 'x' },
        },
        tenantAAuth
      );
      expect(capturedContexts[0].tenantId).toBe('tenant-A');
    });

    it('withTenantContext receives correct userId and userRole', async () => {
      mockReturning.mockResolvedValue([MOCK_ANNOTATION]);
      await service.create(
        {
          assetId: 'asset-1',
          annotationType: 'TEXT',
          layer: 'PERSONAL',
          content: {},
        },
        tenantAAuth
      );
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: 'tenant-A',
          userId: 'user-a',
          userRole: 'STUDENT',
        }),
        expect.any(Function)
      );
    });
  });
});
