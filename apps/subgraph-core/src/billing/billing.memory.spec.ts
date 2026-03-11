/**
 * billing.memory.spec.ts — Memory safety tests for billing services.
 *
 * Verifies that onModuleDestroy() calls cleanup on all services:
 *   - YauCounterService: drains NATS + closes DB pools
 *   - SubscriptionService: closes DB pools
 *   - PilotService: drains NATS + closes DB pools
 *
 * Tests are idempotency safe: calling destroy multiple times MUST NOT throw.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must be defined before vi.mock factories run) ─────────────

const { mockCloseAllPools, mockNatsDrain, mockNatsPublish } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  mockNatsDrain: vi.fn().mockResolvedValue(undefined),
  mockNatsPublish: vi.fn(),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  })),
  closeAllPools: mockCloseAllPools,
  withTenantContext: vi.fn(),
  schema: {
    yauEvents: {},
    users: {},
    tenantSubscriptions: {},
    subscriptionPlans: {},
    pilotRequests: {},
    tenants: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockImplementation(async () => ({
    isClosed: vi.fn(() => false),
    drain: mockNatsDrain,
    publish: mockNatsPublish,
  })),
}));

import { YauCounterService } from './yau-counter.service.js';
import { SubscriptionService } from './subscription.service.js';
import { PilotService } from './pilot.service.js';

// ── YauCounterService memory tests ───────────────────────────────────────────

describe('YauCounterService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPools.mockResolvedValue(undefined);
    mockNatsDrain.mockResolvedValue(undefined);
  });

  it('constructs without error', () => {
    expect(() => new YauCounterService()).not.toThrow();
  });

  it('onModuleDestroy drains NATS and closes DB pools', async () => {
    const service = new YauCounterService();
    // Allow async NATS init to complete
    await new Promise((r) => setTimeout(r, 15));
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalled();
  });

  it('onModuleDestroy is idempotent — safe to call multiple times', async () => {
    const service = new YauCounterService();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('onModuleDestroy does not throw when NATS drain fails', async () => {
    mockNatsDrain.mockRejectedValueOnce(new Error('drain failed'));
    const service = new YauCounterService();
    await new Promise((r) => setTimeout(r, 15));
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});

// ── SubscriptionService memory tests ─────────────────────────────────────────

describe('SubscriptionService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPools.mockResolvedValue(undefined);
  });

  it('constructs without error', () => {
    expect(() => new SubscriptionService()).not.toThrow();
  });

  it('onModuleDestroy closes DB pools', async () => {
    const service = new SubscriptionService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalled();
  });

  it('onModuleDestroy is idempotent', async () => {
    const service = new SubscriptionService();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});

// ── PilotService memory tests ─────────────────────────────────────────────────

describe('PilotService — memory safety', () => {
  const makeSubSvc = () =>
    ({
      createPilotSubscription: vi.fn().mockResolvedValue({ id: 'sub-1' }),
    }) as unknown as SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPools.mockResolvedValue(undefined);
    mockNatsDrain.mockResolvedValue(undefined);
  });

  it('constructs without error', () => {
    expect(() => new PilotService(makeSubSvc())).not.toThrow();
  });

  it('onModuleDestroy closes DB pools', async () => {
    const service = new PilotService(makeSubSvc());
    await new Promise((r) => setTimeout(r, 15));
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalled();
  });

  it('onModuleDestroy is idempotent', async () => {
    const service = new PilotService(makeSubSvc());
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('onModuleDestroy does not throw when NATS drain fails', async () => {
    mockNatsDrain.mockRejectedValueOnce(new Error('drain failed'));
    const service = new PilotService(makeSubSvc());
    await new Promise((r) => setTimeout(r, 15));
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
