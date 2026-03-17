/**
 * yau-enforcement.service.spec.ts — Unit tests for YauEnforcementService.
 * Verifies: YAU counting, soft warning at 80%, hard block at 100%, cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock variables (hoisted for vi.mock) ──────────────────────

const { mockSelect, mockPublish, mockDrain } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockPublish: vi.fn(),
  mockDrain: vi.fn().mockResolvedValue(undefined),
}));

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({ select: mockSelect })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    yauEvents: { tenantId: 'tenantId', year: 'year', isCounted: 'isCounted' },
    tenantSubscriptions: { tenantId: 'tenantId', maxYau: 'maxYau' },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  count: vi.fn(() => 'COUNT(*)'),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    isClosed: vi.fn(() => false),
    drain: mockDrain,
    publish: mockPublish,
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

import { YauEnforcementService, QuotaExceededError } from './yau-enforcement.service.js';

describe('YauEnforcementService', () => {
  let service: YauEnforcementService;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['YAU_ENFORCEMENT_ENABLED'];
    delete process.env['YAU_LIMIT'];
    service = new YauEnforcementService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('constructs without throwing', () => {
    expect(service).toBeDefined();
  });

  it('getYauCount returns count from DB', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ value: 42 }]));
    const result = await service.getYauCount('t1', 2026);
    expect(result).toBe(42);
  });

  it('getYauCount returns 0 when no rows', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));
    const result = await service.getYauCount('t1', 2026);
    expect(result).toBe(0);
  });

  it('getTenantLimit returns maxYau from subscription', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ maxYau: 1000 }]));
    const limit = await service.getTenantLimit('t1');
    expect(limit).toBe(1000);
  });

  it('getTenantLimit falls back to YAU_LIMIT env', async () => {
    process.env['YAU_LIMIT'] = '250';
    mockSelect.mockReturnValueOnce(makeChain([]));
    const limit = await service.getTenantLimit('t1');
    expect(limit).toBe(250);
  });

  it('getTenantLimit falls back to DEFAULT_YAU_LIMIT (500)', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));
    const limit = await service.getTenantLimit('t1');
    expect(limit).toBe(500);
  });

  it('enforce emits soft warning at 80%', async () => {
    // getYauCount returns 80, getTenantLimit returns 100
    mockSelect
      .mockReturnValueOnce(makeChain([{ value: 80 }]))
      .mockReturnValueOnce(makeChain([{ maxYau: 100 }]));
    const result = await service.enforce('t1');
    expect(result.blocked).toBe(false);
    expect(result.utilizationPct).toBe(80);
    expect(mockPublish).toHaveBeenCalledWith(
      'EDUSPHERE.billing.yau_soft_warning',
      expect.any(Uint8Array)
    );
  });

  it('enforce throws QuotaExceededError at 100%', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ value: 100 }]))
      .mockReturnValueOnce(makeChain([{ maxYau: 100 }]));
    await expect(service.enforce('t1')).rejects.toThrow(QuotaExceededError);
    expect(mockPublish).toHaveBeenCalledWith(
      'EDUSPHERE.billing.yau_hard_block',
      expect.any(Uint8Array)
    );
  });

  it('enforce does not warn below 80%', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ value: 50 }]))
      .mockReturnValueOnce(makeChain([{ maxYau: 100 }]));
    const result = await service.enforce('t1');
    expect(result.blocked).toBe(false);
    expect(result.utilizationPct).toBe(50);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('onModuleDestroy clears timers and closes pools', async () => {
    process.env['YAU_ENFORCEMENT_ENABLED'] = 'true';
    const svc = new YauEnforcementService();
    svc.onModuleInit();
    await svc.onModuleDestroy();
    const { closeAllPools } = await import('@edusphere/db');
    expect(closeAllPools).toHaveBeenCalled();
  });

  it('checkAllTenants iterates all tenant subscriptions', async () => {
    // First call: list tenants; then 2x (getYauCount + getTenantLimit) per tenant
    mockSelect
      .mockReturnValueOnce(makeChain([{ tenantId: 'a' }, { tenantId: 'b' }]))
      .mockReturnValueOnce(makeChain([{ value: 10 }]))
      .mockReturnValueOnce(makeChain([{ maxYau: 100 }]))
      .mockReturnValueOnce(makeChain([{ value: 20 }]))
      .mockReturnValueOnce(makeChain([{ maxYau: 100 }]));
    await service.checkAllTenants();
    // 1 (list) + 2*2 (enforce per tenant) = 5 calls
    expect(mockSelect).toHaveBeenCalledTimes(5);
  });
});
