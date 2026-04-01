import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockCloseAllPools,
  mockUpdate,
  mockSet: _mockSet,
  mockWhere: _mockWhere,
  mockReturning,
} = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  return {
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockUpdate: vi.fn().mockReturnValue({ set: mockSet }),
    mockSet,
    mockWhere,
    mockReturning,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    update: mockUpdate,
  })),
  closeAllPools: mockCloseAllPools,
  withTenantContext: vi.fn(
    async (
      _db: unknown,
      _ctx: unknown,
      fn: (db: unknown) => Promise<unknown>
    ) => fn({ update: mockUpdate })
  ),
  schema: {
    tenants: {
      id: 'tenants.id',
      plan: 'tenants.plan',
      updatedAt: 'tenants.updated_at',
    },
  },
  eq: vi.fn(),
}));

import { TenantPlanService } from './tenant-plan.service.js';

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  role: 'SUPER_ADMIN',
};

const MOCK_TENANT = {
  id: 'tenant-1',
  name: 'Acme Corp',
  slug: 'acme',
  plan: 'ENTERPRISE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-03-30'),
};

describe('TenantPlanService', () => {
  let service: TenantPlanService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantPlanService();
  });

  it('instantiates without error', () => {
    expect(service).toBeDefined();
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('updatePlan returns the updated tenant', async () => {
    mockReturning.mockResolvedValueOnce([MOCK_TENANT]);

    const result = await service.updatePlan(
      'tenant-1',
      'ENTERPRISE',
      undefined,
      TENANT_CTX
    );

    expect(result).toEqual(MOCK_TENANT);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('updatePlan throws NotFoundException when tenant not found', async () => {
    mockReturning.mockResolvedValueOnce([]);

    await expect(
      service.updatePlan('nonexistent', 'FREE', undefined, TENANT_CTX)
    ).rejects.toThrow('Tenant nonexistent not found');
  });

  it('updatePlan propagates database errors', async () => {
    mockReturning.mockRejectedValueOnce(new Error('DB error'));

    await expect(
      service.updatePlan('tenant-1', 'STARTER', undefined, TENANT_CTX)
    ).rejects.toThrow('DB error');
  });

  it('updatePlan accepts effectiveDate parameter', async () => {
    mockReturning.mockResolvedValueOnce([MOCK_TENANT]);

    const result = await service.updatePlan(
      'tenant-1',
      'PROFESSIONAL',
      '2026-04-01T00:00:00Z',
      TENANT_CTX
    );

    expect(result).toEqual(MOCK_TENANT);
  });
});
