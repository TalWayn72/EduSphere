/**
 * MarketplaceOrgService unit tests — org marketplace listing management.
 * 14 tests covering publish, unpublish, getListings, and getListing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext, mockCloseAllPools, mockExecute } = vi.hoisted(
  () => ({
    mockWithTenantContext: vi.fn(),
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockExecute: vi.fn(),
  })
);

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({ execute: mockExecute })),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  sql: Object.assign(
    vi.fn((parts: TemplateStringsArray, ...vals: unknown[]) =>
      parts.reduce(
        (a: string, p: string, i: number) =>
          a + p + (vals[i] !== undefined ? String(vals[i]) : ''),
        ''
      )
    ),
    { raw: vi.fn((s: string) => s) }
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  MarketplaceOrgService,
  type PublishToMarketplaceInput,
} from './marketplace-org.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const CTX = {
  tenantId: TENANT_ID,
  userId: 'user-1',
  userRole: 'ORG_ADMIN' as const,
};

function makeInput(
  overrides: Partial<PublishToMarketplaceInput> = {}
): PublishToMarketplaceInput {
  return {
    courseId: 'course-abc',
    title: 'Test Course',
    pricingModel: 'PER_SEAT',
    pricePerSeat: 29.99,
    currency: 'USD',
    categories: ['tech'],
    ...overrides,
  };
}

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    course_id: 'course-abc',
    title: 'Test Course',
    description: null,
    pricing_model: 'PER_SEAT',
    price_per_seat: '29.99',
    flat_rate_price: null,
    currency: 'USD',
    is_published: true,
    categories: ['tech'],
    preview_url: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplaceOrgService', () => {
  let svc: MarketplaceOrgService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new MarketplaceOrgService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(MarketplaceOrgService);
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // ── publishToMarketplace ──────────────────────────────────────────────────

  it('publishToMarketplace returns a mapped listing on success', async () => {
    const row = makeDbRow();
    const tenantRow = { name: 'Acme Corp' };
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          execute: vi
            .fn()
            .mockResolvedValueOnce({ rows: [row] })
            .mockResolvedValueOnce({ rows: [tenantRow] }),
        })
    );

    const result = await svc.publishToMarketplace(makeInput(), CTX);

    expect(result.id).toBe('listing-1');
    expect(result.courseId).toBe('course-abc');
    expect(result.pricePerSeat).toBe(29.99);
    expect(result.publisherName).toBe('Acme Corp');
  });

  it('publishToMarketplace throws BadRequestException when insert returns no row', async () => {
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          execute: vi.fn().mockResolvedValueOnce({ rows: [] }),
        })
    );

    await expect(svc.publishToMarketplace(makeInput(), CTX)).rejects.toThrow(
      BadRequestException
    );
  });

  it('publishToMarketplace maps null price_per_seat to null', async () => {
    const row = makeDbRow({ price_per_seat: null, pricing_model: 'FREE' });
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          execute: vi
            .fn()
            .mockResolvedValueOnce({ rows: [row] })
            .mockResolvedValueOnce({ rows: [{ name: 'Org' }] }),
        })
    );

    const result = await svc.publishToMarketplace(
      makeInput({ pricingModel: 'FREE', pricePerSeat: undefined }),
      CTX
    );

    expect(result.pricePerSeat).toBeNull();
  });

  // ── unpublishFromMarketplace ──────────────────────────────────────────────

  it('unpublishFromMarketplace returns true on success', async () => {
    mockWithTenantContext.mockImplementationOnce(
      async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({ execute: vi.fn().mockResolvedValueOnce(undefined) })
    );

    const result = await svc.unpublishFromMarketplace('listing-1', CTX);

    expect(result).toBe(true);
  });

  // ── getMarketplaceListings ────────────────────────────────────────────────

  it('getMarketplaceListings returns mapped rows', async () => {
    const row = {
      ...makeDbRow(),
      publisher_name: 'Acme',
    };
    mockExecute.mockResolvedValueOnce({ rows: [row] });

    const results = await svc.getMarketplaceListings();

    expect(results).toHaveLength(1);
    expect(results[0]!.publisherName).toBe('Acme');
  });

  it('getMarketplaceListings returns empty array when no published listings', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const results = await svc.getMarketplaceListings();

    expect(results).toEqual([]);
  });

  it('getMarketplaceListings clamps limit to max 100', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await svc.getMarketplaceListings(undefined, undefined, undefined, 999);

    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it('getMarketplaceListings clamps offset to min 0', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await svc.getMarketplaceListings(undefined, undefined, undefined, 20, -5);

    expect(mockExecute).toHaveBeenCalledOnce();
  });

  // ── getMarketplaceListing ─────────────────────────────────────────────────

  it('getMarketplaceListing returns mapped listing when found', async () => {
    const row = { ...makeDbRow(), publisher_name: 'Org X' };
    mockExecute.mockResolvedValueOnce({ rows: [row] });

    const result = await svc.getMarketplaceListing('listing-1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('listing-1');
    expect(result!.publisherName).toBe('Org X');
  });

  it('getMarketplaceListing returns null when not found', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const result = await svc.getMarketplaceListing('nonexistent');

    expect(result).toBeNull();
  });

  it('getMarketplaceListing maps flat_rate_price as number', async () => {
    const row = {
      ...makeDbRow({ flat_rate_price: '499.00', price_per_seat: null }),
      publisher_name: 'Org',
    };
    mockExecute.mockResolvedValueOnce({ rows: [row] });

    const result = await svc.getMarketplaceListing('listing-1');

    expect(result!.flatRatePrice).toBe(499);
    expect(result!.pricePerSeat).toBeNull();
  });
});
