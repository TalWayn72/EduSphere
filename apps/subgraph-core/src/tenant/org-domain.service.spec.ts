import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockCloseAllPools,
  mockSelect,
  mockFrom: _mockFrom,
  mockWhere,
} = vi.hoisted(() => {
  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  return {
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockSelect: vi.fn().mockReturnValue({ from: mockFrom }),
    mockFrom,
    mockWhere,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
  })),
  closeAllPools: mockCloseAllPools,
  withTenantContext: vi.fn(
    async (
      _db: unknown,
      _ctx: unknown,
      fn: (db: unknown) => Promise<unknown>
    ) => fn({ select: mockSelect })
  ),
  schema: {
    tenantDomains: {
      id: 'tenant_domains.id',
      tenantId: 'tenant_domains.tenant_id',
      domain: 'tenant_domains.domain',
      verified: 'tenant_domains.verified',
      createdAt: 'tenant_domains.created_at',
    },
  },
  eq: vi.fn(),
}));

import { OrgDomainService } from './org-domain.service.js';

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  role: 'ORG_ADMIN',
};

describe('OrgDomainService', () => {
  let service: OrgDomainService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrgDomainService();
  });

  it('instantiates without error', () => {
    expect(service).toBeDefined();
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('findByOrgId returns domains for an org', async () => {
    const mockDomains = [
      {
        id: 'dom-1',
        domain: 'acme.edusphere.io',
        verified: true,
        createdAt: new Date('2026-01-01'),
      },
    ];
    mockWhere.mockResolvedValueOnce(mockDomains);

    const result = await service.findByOrgId('org-1', TENANT_CTX);
    expect(result).toEqual(mockDomains);
    expect(mockSelect).toHaveBeenCalled();
  });

  it('findByOrgId returns empty array when no domains exist', async () => {
    mockWhere.mockResolvedValueOnce([]);

    const result = await service.findByOrgId('org-1', TENANT_CTX);
    expect(result).toEqual([]);
  });

  it('findByOrgId propagates database errors', async () => {
    mockWhere.mockRejectedValueOnce(new Error('DB error'));

    await expect(service.findByOrgId('org-1', TENANT_CTX)).rejects.toThrow(
      'DB error'
    );
  });
});
