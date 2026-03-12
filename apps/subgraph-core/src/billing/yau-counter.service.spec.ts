/**
 * yau-counter.service.spec.ts — Unit tests for YauCounterService.
 * Verifies: trackActivity upsert, getYauCount query, snapshot defaults on error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock setup ─────────────────────────────────────────────────────────────

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue([]);
const mockReturning = vi.fn().mockResolvedValue([]);
const _mockWhere = vi.fn();
const _mockLimit = vi.fn();
const _mockFrom = vi.fn();
const _mockOrderBy = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.orderBy = self;
  p.offset = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    transaction: vi.fn(),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn({ insert: mockInsert, select: mockSelect })),
  schema: {
    yauEvents: {
      tenantId: 'tenantId',
      userId: 'userId',
      year: 'year',
      isCounted: 'isCounted',
    },
    users: { tenantId: 'tenantId' },
    tenantSubscriptions: { tenantId: 'tenantId', maxYau: 'maxYau' },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  count: vi.fn(() => 'COUNT(*)'),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    isClosed: vi.fn(() => false),
    drain: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
  }),
}));

import { YauCounterService } from './yau-counter.service.js';

describe('YauCounterService', () => {
  let service: YauCounterService;

  beforeEach(() => {
    vi.clearAllMocks();
    // make insert().values().onConflictDoUpdate() chain work
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
        returning: mockReturning,
      }),
    });
    service = new YauCounterService();
  });

  it('constructs without throwing', () => {
    expect(service).toBeDefined();
  });

  it('trackActivity calls withTenantContext', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    await service.trackActivity('tenant-1', 'user-1', 'STUDENT');
    expect(withTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
      expect.any(Function)
    );
  });

  it('trackActivity does not throw on DB error', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(new Error('DB down'));
    await expect(service.trackActivity('t1', 'u1')).resolves.toBeUndefined();
  });

  it('getYauCount returns 0 on DB error', async () => {
    mockSelect.mockImplementation(() => {
      throw new Error('DB down');
    });
    const count = await service.getYauCount('tenant-1', 2026);
    expect(count).toBe(0);
  });

  it('getYauCount returns value from DB', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ value: 42 }]));
    const count = await service.getYauCount('tenant-1', 2026);
    expect(count).toBe(42);
  });

  it('getMonthlyUsageSnapshot returns zero defaults on error', async () => {
    mockSelect.mockImplementation(() => {
      throw new Error('DB down');
    });
    const snapshot = await service.getMonthlyUsageSnapshot('tenant-1');
    expect(snapshot).toMatchObject({
      tenantId: 'tenant-1',
      yauCount: 0,
      activeUsersCount: 0,
      coursesCount: 0,
      storageGb: 0,
    });
    expect(snapshot.computedAt).toBeInstanceOf(Date);
  });

  it('getMonthlyUsageSnapshot returns tenantId in result', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ value: 10 }]))
      .mockReturnValueOnce(makeChain([{ value: 200 }]));
    const snapshot = await service.getMonthlyUsageSnapshot('my-tenant');
    expect(snapshot.tenantId).toBe('my-tenant');
  });

  it('onModuleDestroy does not throw', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
