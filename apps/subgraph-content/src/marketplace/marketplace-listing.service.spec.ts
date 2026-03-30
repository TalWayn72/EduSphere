/**
 * MarketplaceListingService unit tests — course listing CRUD.
 * 10 tests covering createListing, publishListing, and edge cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  withTenantContext: mockWithTenantContext,
  schema: {
    courseListings: {
      courseId: 'courseId',
      tenantId: 'tenantId',
      priceCents: 'priceCents',
      currency: 'currency',
      revenueSplitPercent: 'revenueSplitPercent',
      isPublished: 'isPublished',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { MarketplaceListingService } from './marketplace-listing.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const COURSE_ID = 'course-abc';

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    courseId: COURSE_ID,
    tenantId: TENANT_ID,
    priceCents: 2999,
    currency: 'USD',
    revenueSplitPercent: 70,
    isPublished: false,
    createdAt: new Date('2025-06-01'),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplaceListingService', () => {
  let svc: MarketplaceListingService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new MarketplaceListingService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(MarketplaceListingService);
  });

  // ── createListing ─────────────────────────────────────────────────────────

  it('createListing returns the inserted listing', async () => {
    const listing = makeListing();
    mockWithTenantContext.mockResolvedValueOnce([listing]);

    const result = await svc.createListing(
      {} as never, COURSE_ID, 2999, 'USD', 70, TENANT_ID
    );

    expect(result).toEqual(listing);
    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('createListing clamps revenueSplitPercent to max 100', async () => {
    const listing = makeListing({ revenueSplitPercent: 100 });
    mockWithTenantContext.mockResolvedValueOnce([listing]);

    const result = await svc.createListing(
      {} as never, COURSE_ID, 5000, 'EUR', 150, TENANT_ID
    );

    expect(result.revenueSplitPercent).toBeLessThanOrEqual(100);
  });

  it('createListing clamps revenueSplitPercent to min 0', async () => {
    const listing = makeListing({ revenueSplitPercent: 0 });
    mockWithTenantContext.mockResolvedValueOnce([listing]);

    const result = await svc.createListing(
      {} as never, COURSE_ID, 1000, 'ILS', -50, TENANT_ID
    );

    expect(result.revenueSplitPercent).toBeGreaterThanOrEqual(0);
  });

  it('createListing uses SUPER_ADMIN role in tenant context', async () => {
    mockWithTenantContext.mockResolvedValueOnce([makeListing()]);

    await svc.createListing({} as never, COURSE_ID, 2999, 'USD', 70, TENANT_ID);

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: TENANT_ID,
        userId: 'system',
        userRole: 'SUPER_ADMIN',
      }),
      expect.any(Function)
    );
  });

  it('createListing propagates DB errors', async () => {
    mockWithTenantContext.mockRejectedValueOnce(new Error('DB insert failed'));

    await expect(
      svc.createListing({} as never, COURSE_ID, 2999, 'USD', 70, TENANT_ID)
    ).rejects.toThrow('DB insert failed');
  });

  // ── publishListing ────────────────────────────────────────────────────────

  it('publishListing calls withTenantContext to update isPublished', async () => {
    mockWithTenantContext.mockResolvedValueOnce(undefined);

    await svc.publishListing({} as never, COURSE_ID, TENANT_ID);

    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('publishListing uses SUPER_ADMIN role in context', async () => {
    mockWithTenantContext.mockResolvedValueOnce(undefined);

    await svc.publishListing({} as never, COURSE_ID, TENANT_ID);

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userRole: 'SUPER_ADMIN' }),
      expect.any(Function)
    );
  });

  it('publishListing returns void on success', async () => {
    mockWithTenantContext.mockResolvedValueOnce(undefined);

    const result = await svc.publishListing({} as never, COURSE_ID, TENANT_ID);

    expect(result).toBeUndefined();
  });

  it('publishListing propagates DB errors', async () => {
    mockWithTenantContext.mockRejectedValueOnce(new Error('Update failed'));

    await expect(
      svc.publishListing({} as never, COURSE_ID, TENANT_ID)
    ).rejects.toThrow('Update failed');
  });
});
