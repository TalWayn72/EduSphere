import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ─── Capture withTenantContext calls ──────────────────────────────────
const capturedContexts: Array<{
  tenantId: string;
  userId: string;
  userRole: string;
}> = [];

const mockReturning = vi.fn();
const mockLimit = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockOffset = vi.fn();
const mockFrom = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();

const mockTx = {
  select: () => ({ from: mockFrom }),
  insert: mockInsert,
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
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: string) => ({ desc: col })),
  sql: Object.assign(
    vi.fn((str: TemplateStringsArray) => str),
    { placeholder: vi.fn() }
  ),
  withTenantContext: vi.fn(async (_db: unknown, ctx: { tenantId: string; userId: string; userRole: string }, cb: (tx: typeof mockTx) => unknown) => {
    capturedContexts.push({ ...ctx });
    return cb(mockTx);
  }),
  closeAllPools: vi.fn(),
}));

import { withTenantContext } from '@edusphere/db';
import { AnnotationService } from '../annotation/annotation.service';

// ─── Auth contexts for two tenants ────────────────────────────────────
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

const TENANT_A_ANNOTATION = {
  id: 'ann-a',
  asset_id: 'asset-a',
  user_id: 'user-a',
  tenant_id: 'tenant-A',
  layer: 'SHARED',
  content: { text: 'Tenant A note' },
  is_resolved: false,
  deleted_at: null,
  created_at: new Date(),
};

describe('Tenant Isolation — cross-tenant annotation security', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedContexts.length = 0;
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockOffset.mockResolvedValue([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit.mockReturnValue({ offset: mockOffset }) });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      returning: mockReturning,
      orderBy: mockOrderBy,
    });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    service = new AnnotationService();
  });

  it('tenant A cannot see tenant B annotations — withTenantContext enforces isolation', async () => {
    // Tenant B queries — RLS context is set to tenant-B, so tenant-A rows are invisible
    mockOffset.mockResolvedValue([]);
    const result = await service.findAll(
      { limit: 10, offset: 0 },
      tenantBAuth
    );
    expect(result).toEqual([]);

    // Verify the tenant context was set to tenant-B (not tenant-A)
    expect(capturedContexts).toHaveLength(1);
    expect(capturedContexts[0].tenantId).toBe('tenant-B');
    expect(capturedContexts[0].tenantId).not.toBe('tenant-A');

    // withTenantContext was called with correct isolation params
    expect(withTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: 'tenant-B',
        userId: 'user-b',
        userRole: 'STUDENT',
      }),
      expect.any(Function)
    );
  });

  it('cross-tenant query returns empty for non-admin — RLS filters out foreign data', async () => {
    // Tenant A has annotations, but tenant B context returns empty (RLS enforcement)
    // First: tenant A creates and sees their annotation
    mockOffset.mockResolvedValueOnce([TENANT_A_ANNOTATION]);
    const tenantAResult = await service.findAll(
      { limit: 10, offset: 0 },
      tenantAAuth
    );
    expect(tenantAResult).toHaveLength(1);
    expect(capturedContexts[0].tenantId).toBe('tenant-A');

    // Second: tenant B queries the same — gets empty results due to RLS
    mockOffset.mockResolvedValueOnce([]);
    const tenantBResult = await service.findAll(
      { limit: 10, offset: 0 },
      tenantBAuth
    );
    expect(tenantBResult).toEqual([]);
    expect(capturedContexts[1].tenantId).toBe('tenant-B');

    // Verify each query used its own tenant context
    expect(capturedContexts[0].tenantId).not.toBe(capturedContexts[1].tenantId);
  });
});
