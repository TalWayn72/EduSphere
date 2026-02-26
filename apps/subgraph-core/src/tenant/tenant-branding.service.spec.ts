import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @edusphere/db before importing the service ──────────────────────────
// Use vi.hoisted() so these are available when vi.mock factory is hoisted to top of file
const mocks = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn(() => ({
    onConflictDoUpdate: mockOnConflictDoUpdate,
  }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockDb = { select: mockSelect, insert: mockInsert };
  return {
    mockLimit,
    mockWhere,
    mockFrom,
    mockSelect,
    mockOnConflictDoUpdate,
    mockValues,
    mockInsert,
    mockDb,
  };
});

const {
  mockLimit,
  _mockWhere,
  _mockFrom,
  mockSelect,
  mockOnConflictDoUpdate,
  mockValues,
  mockInsert,
  _mockDb,
} = mocks;

vi.mock('@edusphere/db', () => ({
  db: mocks.mockDb,
  tenantBranding: {
    tenantId: 'tenantId',
    logoUrl: 'logoUrl',
    logoMarkUrl: 'logoMarkUrl',
    faviconUrl: 'faviconUrl',
    primaryColor: 'primaryColor',
    secondaryColor: 'secondaryColor',
    accentColor: 'accentColor',
    backgroundColor: 'backgroundColor',
    fontFamily: 'fontFamily',
    organizationName: 'organizationName',
    tagline: 'tagline',
    privacyPolicyUrl: 'privacyPolicyUrl',
    termsOfServiceUrl: 'termsOfServiceUrl',
    supportEmail: 'supportEmail',
    hideEduSphereBranding: 'hideEduSphereBranding',
  },
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { TenantBrandingService } from './tenant-branding.service.js';

const DB_BRANDING_ROW = {
  tenantId: 'tenant-abc',
  logoUrl: 'https://cdn.example.com/logo.png',
  logoMarkUrl: 'https://cdn.example.com/logomark.png',
  faviconUrl: 'https://cdn.example.com/favicon.ico',
  primaryColor: '#1a73e8',
  secondaryColor: '#5f6368',
  accentColor: '#fbbc04',
  backgroundColor: '#f8f9fa',
  fontFamily: 'Roboto',
  organizationName: 'Acme Academy',
  tagline: 'Learning at scale',
  privacyPolicyUrl: 'https://acme.example.com/privacy',
  termsOfServiceUrl: 'https://acme.example.com/terms',
  supportEmail: 'help@acme.example.com',
  hideEduSphereBranding: true,
};

describe('TenantBrandingService', () => {
  let service: TenantBrandingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([DB_BRANDING_ROW]);
    service = new TenantBrandingService();
  });

  // ─── getBranding — cache miss (first call) ─────────────────────────────────

  describe('getBranding() — cache miss', () => {
    it('fetches branding from DB on first call (cache miss)', async () => {
      const result = await service.getBranding('tenant-abc');

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result.organizationName).toBe('Acme Academy');
      expect(result.primaryColor).toBe('#1a73e8');
    });

    it('maps all DB fields correctly onto the returned object', async () => {
      const result = await service.getBranding('tenant-abc');

      expect(result).toMatchObject({
        logoUrl: DB_BRANDING_ROW.logoUrl,
        logoMarkUrl: DB_BRANDING_ROW.logoMarkUrl,
        faviconUrl: DB_BRANDING_ROW.faviconUrl,
        primaryColor: DB_BRANDING_ROW.primaryColor,
        secondaryColor: DB_BRANDING_ROW.secondaryColor,
        accentColor: DB_BRANDING_ROW.accentColor,
        backgroundColor: DB_BRANDING_ROW.backgroundColor,
        fontFamily: DB_BRANDING_ROW.fontFamily,
        organizationName: DB_BRANDING_ROW.organizationName,
        tagline: DB_BRANDING_ROW.tagline,
        privacyPolicyUrl: DB_BRANDING_ROW.privacyPolicyUrl,
        termsOfServiceUrl: DB_BRANDING_ROW.termsOfServiceUrl,
        supportEmail: DB_BRANDING_ROW.supportEmail,
        hideEduSphereBranding: DB_BRANDING_ROW.hideEduSphereBranding,
      });
    });

    it('returns DEFAULT_BRANDING when DB has no row for tenant', async () => {
      mockLimit.mockResolvedValue([]);

      const result = await service.getBranding('tenant-no-branding');

      expect(result.organizationName).toBe('EduSphere');
      expect(result.primaryColor).toBe('#2563eb');
      expect(result.logoUrl).toBe('/defaults/logo.svg');
    });
  });

  // ─── getBranding — cache hit (second call) ────────────────────────────────

  describe('getBranding() — cache hit', () => {
    it('does NOT call DB on the second call for the same tenantId', async () => {
      await service.getBranding('tenant-abc');
      await service.getBranding('tenant-abc');

      // DB select should have been called exactly once (first call only)
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('returns identical data from cache on second call', async () => {
      const first = await service.getBranding('tenant-abc');
      const second = await service.getBranding('tenant-abc');

      expect(second).toEqual(first);
    });

    it('isolates caches between different tenantIds', async () => {
      const rowB = {
        ...DB_BRANDING_ROW,
        organizationName: 'Beta Corp',
        tenantId: 'tenant-beta',
      };
      mockLimit
        .mockResolvedValueOnce([DB_BRANDING_ROW])
        .mockResolvedValueOnce([rowB]);

      const resultA = await service.getBranding('tenant-abc');
      const resultB = await service.getBranding('tenant-beta');

      expect(resultA.organizationName).toBe('Acme Academy');
      expect(resultB.organizationName).toBe('Beta Corp');
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });

  // ─── updateBranding — cache invalidation ──────────────────────────────────

  describe('updateBranding() — cache invalidation', () => {
    it('invalidates cache so the next getBranding call hits DB again', async () => {
      await service.getBranding('tenant-abc');
      expect(mockSelect).toHaveBeenCalledTimes(1);

      await service.updateBranding('tenant-abc', { primaryColor: '#000000' });
      await service.getBranding('tenant-abc');

      expect(mockSelect).toHaveBeenCalledTimes(2);
    });

    it('inserts or upserts the record in the DB', async () => {
      await service.updateBranding('tenant-abc', { primaryColor: '#ff0000' });

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledTimes(1);
      expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
    });

    it('uses provided organizationName when supplied', async () => {
      await service.updateBranding('tenant-abc', {
        organizationName: 'New Name',
      });

      const [valuesArg] = mockValues.mock.calls[0];
      expect(valuesArg.organizationName).toBe('New Name');
    });

    it('defaults organizationName to My Organization when not supplied', async () => {
      await service.updateBranding('tenant-abc', { primaryColor: '#abc' });

      const [valuesArg] = mockValues.mock.calls[0];
      expect(valuesArg.organizationName).toBe('My Organization');
    });
  });

  // ─── onModuleDestroy — memory safety ──────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('clears the cache so subsequent getBranding calls re-query the DB', async () => {
      await service.getBranding('tenant-abc');
      service.onModuleDestroy();

      await service.getBranding('tenant-abc');
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});
