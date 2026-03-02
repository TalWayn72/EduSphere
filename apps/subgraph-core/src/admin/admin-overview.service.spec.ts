/**
 * admin-overview.service.spec.ts — Unit tests for AdminOverviewService.
 * Verifies: SAFE_DEFAULTS fallback, DB query delegation, ISO timestamp mapping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockDbSelect } = vi.hoisted(() => ({ mockDbSelect: vi.fn() }));

vi.mock('@edusphere/db', () => ({
  db: { select: mockDbSelect },
  users: { tenant_id: {}, updated_at: {} },
  scimSyncLog: { createdAt: {}, tenantId: {} },
  count: vi.fn(() => 'COUNT(*)'),
  gte: vi.fn(),
  eq: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { AdminOverviewService } from './admin-overview.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a fully chainable Drizzle select mock that resolves at any terminal call.
 * The service calls:
 *   db.select(...).from(...).where(...)         → Promise([rows])
 *   db.select(...).from(...).where(...).orderBy(...).limit(1) → Promise([rows])
 * We make every chain method return a thenable Promise that also has the chain methods.
 */
function makeThenableChain(
  rows: unknown[]
): Promise<unknown[]> & Record<string, () => unknown> {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, () => unknown>;
  // Attach chain methods so .from().where().orderBy().limit() all work
  const self = (): typeof p => p;
  p.from = self;
  p.where = self;
  p.orderBy = self;
  p.limit = self;
  p.offset = self;
  return p;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminOverviewService', () => {
  let service: AdminOverviewService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminOverviewService();
  });

  // 1. onModuleDestroy is a no-op
  it('onModuleDestroy does not throw', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });

  // 2. Returns SAFE_DEFAULTS on DB error
  it('returns SAFE_DEFAULTS when db.select throws', async () => {
    mockDbSelect.mockImplementation(() => {
      throw new Error('DB down');
    });
    const result = await service.getOverview('tenant-1');
    expect(result.totalUsers).toBe(0);
    expect(result.storageUsedMb).toBe(0);
    expect(result.lastScimSync).toBeNull();
  });

  // 3. Returns totalUsers from DB count result
  it('returns totalUsers from the first DB select result', async () => {
    mockDbSelect
      .mockReturnValueOnce(makeThenableChain([{ value: 77 }])) // totalUsers
      .mockReturnValueOnce(makeThenableChain([{ value: 5 }])) // activeUsers
      .mockReturnValueOnce(makeThenableChain([])); // scim (empty)
    const result = await service.getOverview('tenant-1');
    expect(result.totalUsers).toBe(77);
  });

  // 4. Uses tenantId as filter argument — db.select is called at least once
  it('calls db.select when tenantId is provided', async () => {
    mockDbSelect
      .mockReturnValueOnce(makeThenableChain([{ value: 3 }]))
      .mockReturnValueOnce(makeThenableChain([{ value: 1 }]))
      .mockReturnValueOnce(makeThenableChain([]));
    await service.getOverview('my-tenant-id');
    expect(mockDbSelect).toHaveBeenCalled();
  });

  // 5. Returns lastScimSync as ISO string when DB row has a Date
  it('returns lastScimSync as ISO string when scimSyncLog row has createdAt', async () => {
    const syncDate = new Date('2026-01-15T12:00:00Z');
    mockDbSelect
      .mockReturnValueOnce(makeThenableChain([{ value: 10 }]))
      .mockReturnValueOnce(makeThenableChain([{ value: 2 }]))
      .mockReturnValueOnce(makeThenableChain([{ createdAt: syncDate }]));
    const result = await service.getOverview('tenant-x');
    expect(result.lastScimSync).toBe(syncDate.toISOString());
  });

  // 6. Returns lastScimSync null when no scim rows
  it('returns lastScimSync null when scimSyncLog is empty', async () => {
    mockDbSelect
      .mockReturnValueOnce(makeThenableChain([{ value: 1 }]))
      .mockReturnValueOnce(makeThenableChain([{ value: 0 }]))
      .mockReturnValueOnce(makeThenableChain([]));
    const result = await service.getOverview('tenant-y');
    expect(result.lastScimSync).toBeNull();
  });

  // 7. Service instantiates without error
  it('instantiates without throwing', () => {
    expect(() => new AdminOverviewService()).not.toThrow();
  });

  // 8. SAFE_DEFAULTS has expected shape
  it('SAFE_DEFAULTS has all zero/null fields', async () => {
    mockDbSelect.mockImplementation(() => {
      throw new Error('force defaults');
    });
    const result = await service.getOverview('t');
    expect(result).toMatchObject({
      totalUsers: 0,
      activeUsersThisMonth: 0,
      totalCourses: 0,
      completionsThisMonth: 0,
      atRiskCount: 0,
      lastScimSync: null,
      lastComplianceReport: null,
      storageUsedMb: 0,
    });
  });
});
