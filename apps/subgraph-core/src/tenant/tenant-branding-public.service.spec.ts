import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @edusphere/db
vi.mock('@edusphere/db', () => ({
  db: { select: vi.fn() },
  tenantBranding: {
    primaryColor: 'primaryColor',
    accentColor: 'accentColor',
    logoUrl: 'logoUrl',
    faviconUrl: 'faviconUrl',
    organizationName: 'organizationName',
    tagline: 'tagline',
    tenantId: 'tenantId',
  },
  tenants: { id: 'id', name: 'name', slug: 'slug' },
  eq: vi.fn((a, b) => ({ a, b })),
  closeAllPools: vi.fn(),
}));

import { TenantBrandingService } from './tenant-branding.service';

describe('TenantBrandingService.getPublicBranding', () => {
  let service: TenantBrandingService;
  let mockDb: { select: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const { db } = await import('@edusphere/db');
    mockDb = db as typeof mockDb;
    service = new TenantBrandingService();
    vi.clearAllMocks();
  });

  it('returns branding data for a valid slug', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          primaryColor: '#2563eb',
          accentColor: '#f59e0b',
          logoUrl: '/logo.svg',
          faviconUrl: '/fav.ico',
          organizationName: 'AcmeCorp',
          tagline: 'Learn Better',
        },
      ]),
    };
    mockDb.select.mockReturnValue(chain);
    const result = await service.getPublicBranding('acme');
    expect(result).not.toBeNull();
    expect(result?.organizationName).toBe('AcmeCorp');
    expect(result?.primaryColor).toBe('#2563eb');
    expect(result?.accentColor).toBe('#f59e0b');
  });

  it('returns null for unknown slug', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockDb.select.mockReturnValue(chain);
    const result = await service.getPublicBranding('unknown-tenant');
    expect(result).toBeNull();
  });

  it('returns null on DB error (graceful fallback)', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    };
    mockDb.select.mockReturnValue(chain);
    const result = await service.getPublicBranding('any-slug');
    expect(result).toBeNull();
  });
});
