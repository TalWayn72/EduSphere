import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantResolver } from './tenant.resolver';

const MOCK_TENANT = {
  id: 'tenant-1',
  name: 'Acme Corp',
  plan: 'PROFESSIONAL',
  createdAt: new Date('2026-01-01'),
};

describe('TenantResolver', () => {
  let resolver: TenantResolver;
  let tenantService: {
    findById: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    tenantService = {
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    // Direct instantiation — avoids NestJS module compilation overhead
    resolver = new TenantResolver(tenantService as any);
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
});
