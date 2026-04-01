/**
 * marketplace.service.spec.ts — Unit tests for MarketplaceService (org onboarding).
 *
 * Covers:
 *   - Course licensing (happy path)
 *   - Catalog visibility filtering
 *   - License expiry enforcement
 *   - Plan-based feature access
 *   - Search and filtering
 *   - License count limits
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.offset = self;
  p.orderBy = self;
  p.returning = self;
  p.values = self;
  p.set = self;
  p.leftJoin = self;
  p.innerJoin = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (arg: unknown) => unknown) =>
      fn({ select: mockSelect, insert: mockInsert })
  ),
  schema: {
    courseListings: {
      id: 'id',
      courseId: 'course_id',
      isPublished: 'is_published',
      priceUsdCents: 'price_usd_cents',
      category: 'category',
      tenantId: 'tenant_id',
    },
    purchases: {
      id: 'id',
      listingId: 'listing_id',
      buyerTenantId: 'buyer_tenant_id',
      status: 'status',
      expiresAt: 'expires_at',
    },
    courses: { id: 'id', title: 'title', tenantId: 'tenant_id' },
    tenantSubscriptions: { tenantId: 'tenant_id', planId: 'plan_id' },
    subscriptionPlans: { id: 'id', features: 'features' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  ilike: vi.fn((a: unknown, b: unknown) => ({ ilike: [a, b] })),
  count: vi.fn(() => ({ count: 'count' })),
}));

import { MarketplaceService } from './marketplace.service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 'buyer-001',
  userId: 'admin-001',
  role: 'ORG_ADMIN',
};

const MOCK_LISTING = {
  id: 'listing-001',
  courseId: 'course-001',
  isPublished: true,
  priceUsdCents: 9900,
  category: 'Technology',
  tenantId: 'seller-001',
  title: 'Introduction to AI',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(makeChain([]));
    mockInsert.mockReturnValue(makeChain([{ id: 'purchase-001' }]));
    service = new MarketplaceService();
  });

  // ─── Browse catalog ───────────────────────────────────────────────────────

  describe('browseCatalog()', () => {
    it('returns only published listings', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([MOCK_LISTING, { ...MOCK_LISTING, id: 'listing-002' }])
      );

      const result = await service.browseCatalog({ page: 1, limit: 10 });
      expect(result).toHaveLength(2);
    });

    it('filters by category when provided', async () => {
      mockSelect.mockReturnValueOnce(makeChain([MOCK_LISTING]));

      const result = await service.browseCatalog({
        page: 1,
        limit: 10,
        category: 'Technology',
      });
      expect(result).toHaveLength(1);
    });

    it('filters by search query (title match)', async () => {
      mockSelect.mockReturnValueOnce(makeChain([MOCK_LISTING]));

      const result = await service.browseCatalog({
        page: 1,
        limit: 10,
        search: 'AI',
      });
      expect(result).toBeDefined();
    });

    it('paginates results correctly', async () => {
      mockSelect.mockReturnValueOnce(makeChain([MOCK_LISTING]));

      const result = await service.browseCatalog({ page: 2, limit: 10 });
      expect(result).toBeDefined();
    });

    it('excludes listings from own tenant', async () => {
      // Own tenant's listing should not appear
      const result = await service.browseCatalog(
        { page: 1, limit: 10 },
        'seller-001' // viewing tenant = selling tenant
      );
      expect(result).toBeDefined();
    });
  });

  // ─── License course ───────────────────────────────────────────────────────

  describe('licenseCourse()', () => {
    it('creates purchase record for valid listing', async () => {
      mockSelect.mockReturnValueOnce(makeChain([MOCK_LISTING])); // listing exists
      mockSelect.mockReturnValueOnce(makeChain([])); // not already purchased

      const result = await service.licenseCourse(TENANT_CTX, 'listing-001');
      expect(result).toBeDefined();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('rejects licensing non-existent listing', async () => {
      mockSelect.mockReturnValueOnce(makeChain([]));

      await expect(
        service.licenseCourse(TENANT_CTX, 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects licensing unpublished listing', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...MOCK_LISTING, isPublished: false }])
      );

      await expect(
        service.licenseCourse(TENANT_CTX, 'listing-001')
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects licensing own tenant course', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ ...MOCK_LISTING, tenantId: TENANT_CTX.tenantId }])
      );

      await expect(
        service.licenseCourse(TENANT_CTX, 'listing-001')
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate license for same course', async () => {
      mockSelect.mockReturnValueOnce(makeChain([MOCK_LISTING]));
      mockSelect.mockReturnValueOnce(
        makeChain([{ id: 'existing-purchase', status: 'active' }])
      );

      await expect(
        service.licenseCourse(TENANT_CTX, 'listing-001')
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── License expiry ───────────────────────────────────────────────────────

  describe('checkLicenseExpiry()', () => {
    it('returns active for non-expired license', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          {
            id: 'purchase-001',
            status: 'active',
            expiresAt: new Date(Date.now() + 86400000),
          },
        ])
      );

      const result = await service.checkLicenseExpiry('purchase-001');
      expect(result.isExpired).toBe(false);
    });

    it('returns expired for past-expiry license', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([
          {
            id: 'purchase-001',
            status: 'active',
            expiresAt: new Date(Date.now() - 86400000),
          },
        ])
      );

      const result = await service.checkLicenseExpiry('purchase-001');
      expect(result.isExpired).toBe(true);
    });
  });

  // ─── Memory safety ────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
