import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  withTenantContext: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@edusphere/auth', () => ({}));

import { MarketplaceResolver } from './marketplace.resolver.js';

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

const mockMarketplaceService = {
  getListings: vi.fn(),
  getUserPurchases: vi.fn(),
  getInstructorEarnings: vi.fn(),
  createListing: vi.fn(),
  publishListing: vi.fn(),
  purchaseCourse: vi.fn(),
  requestPayout: vi.fn(),
};

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-market';
const USER_ID = 'user-market';

const AUTH_CTX = {
  tenantId: TENANT_ID,
  userId: USER_ID,
  roles: ['INSTRUCTOR'],
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  username: 'alice42',
};

/** Pass `null` to simulate missing authContext */
const makeCtx = (auth: typeof AUTH_CTX | null = AUTH_CTX) => ({
  authContext: auth ?? undefined,
});

const LISTING = {
  id: 'listing-1',
  courseId: 'course-1',
  priceCents: 4999,
  currency: 'USD',
  isPublished: true,
  revenueSplitPercent: 70,
};

const PURCHASE = {
  id: 'purchase-1',
  courseId: 'course-1',
  amountCents: 4999,
  status: 'COMPLETED',
  purchasedAt: new Date('2026-02-01T10:00:00.000Z'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MarketplaceResolver', () => {
  let resolver: MarketplaceResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new MarketplaceResolver(mockMarketplaceService as never);
  });

  // ── requireAuth ────────────────────────────────────────────────────────────

  it('getCourseListings — throws UnauthorizedException when authContext absent', async () => {
    await expect(resolver.getCourseListings(makeCtx(null))).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('getCourseListings — throws UnauthorizedException when tenantId missing', async () => {
    const ctx = { authContext: { ...AUTH_CTX, tenantId: '' } };
    await expect(resolver.getCourseListings(ctx as never)).rejects.toThrow(
      UnauthorizedException
    );
  });

  // ── getCourseListings ──────────────────────────────────────────────────────

  it('getCourseListings — calls service with tenantId and maps listing fields', async () => {
    mockMarketplaceService.getListings.mockResolvedValue([LISTING]);

    const result = await resolver.getCourseListings(makeCtx());

    expect(mockMarketplaceService.getListings).toHaveBeenCalledWith(TENANT_ID);
    expect(result[0]).toEqual({
      id: 'listing-1',
      courseId: 'course-1',
      priceCents: 4999,
      currency: 'USD',
      isPublished: true,
      revenueSplitPercent: 70,
    });
  });

  it('getCourseListings — returns empty array when no listings exist', async () => {
    mockMarketplaceService.getListings.mockResolvedValue([]);

    const result = await resolver.getCourseListings(makeCtx());

    expect(result).toEqual([]);
  });

  // ── getMyPurchases ────────────────────────────────────────────────────────

  it('getMyPurchases — maps purchasedAt Date to ISO string', async () => {
    mockMarketplaceService.getUserPurchases.mockResolvedValue([PURCHASE]);

    const result = await resolver.getMyPurchases(makeCtx());

    expect(mockMarketplaceService.getUserPurchases).toHaveBeenCalledWith(
      USER_ID,
      TENANT_ID
    );
    expect(result[0]?.purchasedAt).toBe('2026-02-01T10:00:00.000Z');
    expect(result[0]?.amountCents).toBe(4999);
    expect(result[0]?.status).toBe('COMPLETED');
  });

  // ── getInstructorEarnings ─────────────────────────────────────────────────

  it('getInstructorEarnings — maps purchases purchasedAt to ISO string and returns earnings', async () => {
    const earnings = {
      totalEarnedCents: 3499,
      pendingPayoutCents: 1000,
      paidOutCents: 2499,
      purchases: [PURCHASE],
    };
    mockMarketplaceService.getInstructorEarnings.mockResolvedValue(earnings);

    const result = await resolver.getInstructorEarnings(makeCtx());

    expect(result.totalEarnedCents).toBe(3499);
    expect(result.pendingPayoutCents).toBe(1000);
    expect(result.paidOutCents).toBe(2499);
    expect(result.purchases[0]?.purchasedAt).toBe('2026-02-01T10:00:00.000Z');
  });

  // ── createCourseListing ───────────────────────────────────────────────────

  it('createCourseListing — passes args to service and formats listing', async () => {
    mockMarketplaceService.createListing.mockResolvedValue(LISTING);

    const result = await resolver.createCourseListing(
      'course-1',
      4999,
      'USD',
      70,
      makeCtx()
    );

    expect(mockMarketplaceService.createListing).toHaveBeenCalledWith(
      'course-1',
      4999,
      'USD',
      70,
      TENANT_ID
    );
    expect(result.id).toBe('listing-1');
  });

  // ── requestPayout ─────────────────────────────────────────────────────────

  it('requestPayout — delegates to service and returns true', async () => {
    mockMarketplaceService.requestPayout.mockResolvedValue(undefined);

    const result = await resolver.requestPayout(makeCtx());

    expect(mockMarketplaceService.requestPayout).toHaveBeenCalledWith(
      USER_ID,
      TENANT_ID
    );
    expect(result).toBe(true);
  });
});
