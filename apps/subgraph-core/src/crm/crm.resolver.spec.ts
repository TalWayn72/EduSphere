/**
 * crm.resolver.spec.ts — Unit tests for CrmResolver.
 * Covers: header extraction, null/empty returns, delegation to CrmService.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

// ── Import after mocks ────────────────────────────────────────────────────────

import { CrmResolver } from './crm.resolver.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function makeCtx(tenantId?: string) {
  return {
    req: {
      headers: tenantId ? { 'x-tenant-id': tenantId } : {},
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CrmResolver', () => {
  let resolver: CrmResolver;
  let mockService: ReturnType<typeof makeCrmService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = makeCrmService();
    resolver = new CrmResolver(mockService as never);
  });

  // 1. crmConnection returns null when x-tenant-id header is absent
  it('crmConnection returns null when x-tenant-id header is missing', async () => {
    const result = await resolver.crmConnection(makeCtx());
    expect(result).toBeNull();
    expect(mockService.getConnection).not.toHaveBeenCalled();
  });

  // 2. crmConnection returns null when service returns null (no connection)
  it('crmConnection returns null when service has no connection for tenant', async () => {
    mockService.getConnection.mockResolvedValue(null);
    const result = await resolver.crmConnection(makeCtx('tenant-1'));
    expect(result).toBeNull();
  });

  // 3. crmConnection returns shaped object when service returns a connection
  it('crmConnection returns mapped object with ISO createdAt when connection exists', async () => {
    mockService.getConnection.mockResolvedValue(CONN);
    const result = (await resolver.crmConnection(
      makeCtx('tenant-1')
    )) as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result?.['id']).toBe('conn-1');
    expect(result?.['provider']).toBe('SALESFORCE');
    expect(result?.['createdAt']).toBe(CONN.createdAt.toISOString());
  });

  // 4. crmSyncLog returns empty array when x-tenant-id header is absent
  it('crmSyncLog returns [] when x-tenant-id header is missing', async () => {
    const result = await resolver.crmSyncLog(makeCtx(), 10);
    expect(result).toEqual([]);
    expect(mockService.getSyncLog).not.toHaveBeenCalled();
  });

  // 5. crmSyncLog maps entries with ISO createdAt
  it('crmSyncLog returns mapped entries with ISO createdAt', async () => {
    mockService.getSyncLog.mockResolvedValue([SYNC_ENTRY]);
    const result = (await resolver.crmSyncLog(
      makeCtx('tenant-1'),
      5
    )) as Record<string, unknown>[];
    expect(result).toHaveLength(1);
    expect(result[0]?.['createdAt']).toBe(SYNC_ENTRY.createdAt.toISOString());
    expect(result[0]?.['operation']).toBe('COMPLETION_SYNC');
  });

  // 6. disconnectCrm returns false when x-tenant-id header is absent
  it('disconnectCrm returns false when x-tenant-id header is missing', async () => {
    const result = await resolver.disconnectCrm(makeCtx());
    expect(result).toBe(false);
    expect(mockService.disconnectCrm).not.toHaveBeenCalled();
  });

  // 7. disconnectCrm returns true after calling service.disconnectCrm
  it('disconnectCrm delegates to service and returns true', async () => {
    const result = await resolver.disconnectCrm(makeCtx('tenant-1'));
    expect(result).toBe(true);
    expect(mockService.disconnectCrm).toHaveBeenCalledWith('tenant-1');
  });
});
