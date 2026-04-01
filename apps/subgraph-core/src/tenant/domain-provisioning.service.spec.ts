/**
 * DomainProvisioningService — Unit tests
 *
 * Tests domain validation, subdomain creation, custom domain flow.
 * Uses mocked DB + MockDnsProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @edusphere/db before import
vi.mock('@edusphere/db', () => {
  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'dom-1' }]),
    }),
  });
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });
  const mockDelete = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'dom-1' }]),
    }),
  });

  return {
    createDatabaseConnection: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    })),
    closeAllPools: vi.fn().mockResolvedValue(undefined),
    schema: {
      tenantDomains: { tenantId: 'tenant_id', domain: 'domain' },
      customDomains: {
        id: 'id',
        tenantId: 'tenant_id',
        domain: 'domain',
        verificationToken: 'verification_token',
      },
    },
    eq: vi.fn((a, b) => ({ field: a, value: b })),
    and: vi.fn((...args: unknown[]) => args),
    withTenantContext: vi.fn(
      (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
        fn(_db)
    ),
  };
});

// Mock @edusphere/dns-provider — use class syntax so `new` works
vi.mock('@edusphere/dns-provider', () => {
  return {
    MockDnsProvider: class {
      createSubdomain = vi
        .fn()
        .mockResolvedValue({ url: 'https://test.edusphere.io' });
      deleteSubdomain = vi.fn().mockResolvedValue(undefined);
      requestDomainVerification = vi.fn().mockResolvedValue({
        token: 'verify-token-123',
        recordType: 'TXT',
        recordValue: '_edusphere-verification.learn.example.com',
      });
      checkDomainVerification = vi.fn().mockResolvedValue(true);
    },
  };
});

import { DomainProvisioningService } from './domain-provisioning.service';
import type { TenantContext } from '@edusphere/db';

describe('DomainProvisioningService', () => {
  let service: DomainProvisioningService;
  const tenantCtx: TenantContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'ORG_ADMIN',
  };

  beforeEach(() => {
    service = new DomainProvisioningService();
  });

  describe('createSubdomain', () => {
    it('returns subdomain URL', async () => {
      const result = await service.createSubdomain('acme', tenantCtx);
      expect(result.url).toBe('https://test.edusphere.io');
    });
  });

  describe('requestCustomDomain', () => {
    it('returns verification info for valid domain', async () => {
      const result = await service.requestCustomDomain(
        'learn.example.com',
        tenantCtx
      );
      expect(result.token).toBe('verify-token-123');
      expect(result.recordType).toBe('TXT');
      expect(result.instructions).toContain('TXT');
    });

    it('rejects invalid domain format', async () => {
      await expect(
        service.requestCustomDomain('not a domain', tenantCtx)
      ).rejects.toThrow('Invalid domain format');
    });

    it('rejects domain without TLD', async () => {
      await expect(
        service.requestCustomDomain('localhost', tenantCtx)
      ).rejects.toThrow('Invalid domain format');
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
