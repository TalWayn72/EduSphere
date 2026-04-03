/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks use any for partial service stubs */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantResolver } from './tenant.resolver';

const MOCK_TENANT = {
  id: 'tenant-1',
  name: 'Acme Corp',
  slug: 'acme',
  plan: 'PROFESSIONAL',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-03-30'),
};

const MOCK_DOMAINS = [
  {
    id: 'dom-1',
    domain: 'acme.edusphere.io',
    verified: true,
    createdAt: new Date('2026-01-01'),
  },
];

const AUTH_CONTEXT = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  email: 'admin@test.com',
  username: 'admin',
  roles: ['SUPER_ADMIN' as const],
  scopes: [],
  isSuperAdmin: true,
};

describe('TenantResolver', () => {
  let resolver: TenantResolver;
  let tenantService: {
    findById: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };
  let orgDomainService: {
    findByOrgId: ReturnType<typeof vi.fn>;
  };
  let tenantPlanService: {
    updatePlan: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    tenantService = {
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    orgDomainService = {
      findByOrgId: vi.fn(),
    };
    tenantPlanService = {
      updatePlan: vi.fn(),
    };
    resolver = new TenantResolver(
      tenantService as any,
      {} as any, // tenantLanguageService
      {} as any, // tenantBrandingService
      orgDomainService as any,
      tenantPlanService as any
    );
  });

  describe('getTenant()', () => {
    it('returns a tenant by id', async () => {
      tenantService.findById.mockResolvedValue(MOCK_TENANT);
      const result = await resolver.getTenant('tenant-1');
      expect(result).toEqual(MOCK_TENANT);
      expect(tenantService.findById).toHaveBeenCalledWith('tenant-1');
    });

    it('returns null when tenant not found', async () => {
      tenantService.findById.mockResolvedValue(null);
      const result = await resolver.getTenant('nonexistent');
      expect(result).toBeNull();
    });

    it('propagates errors from TenantService', async () => {
      tenantService.findById.mockRejectedValue(new Error('DB error'));
      await expect(resolver.getTenant('tenant-1')).rejects.toThrow('DB error');
    });
  });

  describe('getTenants()', () => {
    it('returns a list of tenants', async () => {
      tenantService.findAll.mockResolvedValue([MOCK_TENANT]);
      const result = await resolver.getTenants(10, 0);
      expect(result).toEqual([MOCK_TENANT]);
      expect(tenantService.findAll).toHaveBeenCalledWith(10, 0);
    });

    it('passes limit and offset to service', async () => {
      tenantService.findAll.mockResolvedValue([]);
      await resolver.getTenants(25, 50);
      expect(tenantService.findAll).toHaveBeenCalledWith(25, 50);
    });

    it('returns empty array when no tenants exist', async () => {
      tenantService.findAll.mockResolvedValue([]);
      const result = await resolver.getTenants(10, 0);
      expect(result).toEqual([]);
    });

    it('propagates errors from TenantService', async () => {
      tenantService.findAll.mockRejectedValue(new Error('DB error'));
      await expect(resolver.getTenants(10, 0)).rejects.toThrow('DB error');
    });
  });

  describe('getOrganizationDomains()', () => {
    it('returns domains for an org', async () => {
      orgDomainService.findByOrgId.mockResolvedValue(MOCK_DOMAINS);

      const result = await resolver.getOrganizationDomains('org-1', {
        req: {},
        authContext: AUTH_CONTEXT,
      });

      expect(result).toEqual(MOCK_DOMAINS);
      expect(orgDomainService.findByOrgId).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ tenantId: 'tenant-1' })
      );
    });

    it('throws when unauthenticated', async () => {
      await expect(
        resolver.getOrganizationDomains('org-1', { req: {} })
      ).rejects.toThrow('Unauthenticated');
    });
  });

  describe('updateTenantPlan()', () => {
    it('updates tenant plan successfully', async () => {
      tenantPlanService.updatePlan.mockResolvedValue({
        ...MOCK_TENANT,
        plan: 'ENTERPRISE',
      });

      const result = await resolver.updateTenantPlan(
        {
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
          plan: 'ENTERPRISE',
        },
        { req: {}, authContext: AUTH_CONTEXT }
      );

      expect(result.plan).toBe('ENTERPRISE');
      expect(tenantPlanService.updatePlan).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'ENTERPRISE',
        undefined,
        expect.objectContaining({ userId: 'user-1' })
      );
    });

    it('throws when unauthenticated', async () => {
      await expect(
        resolver.updateTenantPlan(
          {
            tenantId: '550e8400-e29b-41d4-a716-446655440000',
            plan: 'FREE',
          },
          { req: {} }
        )
      ).rejects.toThrow('Unauthenticated');
    });

    it('rejects invalid plan values via Zod', async () => {
      await expect(
        resolver.updateTenantPlan(
          { tenantId: 'not-a-uuid', plan: 'INVALID' },
          { req: {}, authContext: AUTH_CONTEXT }
        )
      ).rejects.toThrow();
    });
  });
});
