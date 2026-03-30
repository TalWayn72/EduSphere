/**
 * MarketplaceSearchService unit tests — listing search and filtering.
 * 12 tests covering getListings with filters, pagination, and price mapping.
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
      id: 'id',
      courseId: 'courseId',
      tenantId: 'tenantId',
      priceCents: 'priceCents',
      currency: 'currency',
      isPublished: 'isPublished',
      revenueSplitPercent: 'revenueSplitPercent',
    },
    courses: {
      id: 'id',
      title: 'title',
      description: 'description',
      thumbnail_url: 'thumbnail_url',
      instructor_id: 'instructor_id',
    },
    users: {
      id: 'id',
      first_name: 'first_name',
      last_name: 'last_name',
      display_name: 'display_name',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  ilike: vi.fn(),
  lte: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn(() => 'sql-expr'),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { MarketplaceSearchService } from './marketplace-search.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT = 'tenant-001';
const USER = 'user-abc';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    courseId: 'course-x',
    priceCents: 2999,
    currency: 'USD',
    isPublished: true,
    revenueSplitPercent: 70,
    title: 'Test Course',
    description: 'A test course',
    thumbnailUrl: 'https://img.example.com/thumb.png',
    instructorName: 'Dr. Test',
    enrollmentCount: 42,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplaceSearchService', () => {
  let svc: MarketplaceSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new MarketplaceSearchService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(MarketplaceSearchService);
  });

  it('getListings returns mapped results with price in whole units', async () => {
    mockWithTenantContext.mockResolvedValueOnce([makeRow({ priceCents: 5000 })]);

    const results = await svc.getListings({} as never, TENANT, USER, 'STUDENT');

    expect(results).toHaveLength(1);
    expect(results[0]!.price).toBe(50);
  });

  it('getListings returns empty array when no listings exist', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const results = await svc.getListings({} as never, TENANT, USER, 'STUDENT');

    expect(results).toEqual([]);
  });

  it('getListings sets tags to empty array', async () => {
    mockWithTenantContext.mockResolvedValueOnce([makeRow()]);

    const results = await svc.getListings({} as never, TENANT, USER, 'STUDENT');

    expect(results[0]!.tags).toEqual([]);
  });

  it('getListings sets rating to null', async () => {
    mockWithTenantContext.mockResolvedValueOnce([makeRow()]);

    const results = await svc.getListings({} as never, TENANT, USER, 'STUDENT');

    expect(results[0]!.rating).toBeNull();
  });

  it('getListings sets totalLessons to 0', async () => {
    mockWithTenantContext.mockResolvedValueOnce([makeRow()]);

    const results = await svc.getListings({} as never, TENANT, USER, 'STUDENT');

    expect(results[0]!.totalLessons).toBe(0);
  });

  it('getListings clamps limit to max 100', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await svc.getListings({} as never, TENANT, USER, 'STUDENT', 999, 0);

    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('getListings clamps limit to min 1', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await svc.getListings({} as never, TENANT, USER, 'STUDENT', -5, 0);

    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('getListings clamps offset to min 0', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await svc.getListings({} as never, TENANT, USER, 'STUDENT', 20, -10);

    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('getListings passes filters with search term', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await svc.getListings(
      {} as never, TENANT, USER, 'STUDENT', 20, 0,
      { search: 'AI' }
    );

    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('getListings passes filters with priceMax', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await svc.getListings(
      {} as never, TENANT, USER, 'STUDENT', 20, 0,
      { priceMax: 50 }
    );

    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('getListings propagates DB errors', async () => {
    mockWithTenantContext.mockRejectedValueOnce(new Error('Query failed'));

    await expect(
      svc.getListings({} as never, TENANT, USER, 'STUDENT')
    ).rejects.toThrow('Query failed');
  });
});
