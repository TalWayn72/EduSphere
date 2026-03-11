/**
 * subscription.service.spec.ts — Unit tests for SubscriptionService.
 * Verifies: isPilotActive/Expired logic, getTenantSubscription NotFoundException,
 * createPilotSubscription, onModuleDestroy cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockReturning = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.orderBy = self;
  p.leftJoin = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: vi.fn(),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn({ insert: mockInsert, select: mockSelect })),
  schema: {
    tenantSubscriptions: {
      tenantId: 'tenantId',
      planId: 'planId',
      id: 'id',
      status: 'status',
      created_at: 'created_at',
    },
    subscriptionPlans: { id: 'id', isActive: 'isActive' },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}));

import { SubscriptionService } from './subscription.service.js';

const CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'ORG_ADMIN' as const };

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: mockReturning }),
    });
    service = new SubscriptionService();
  });

  it('constructs without throwing', () => {
    expect(service).toBeDefined();
  });

  it('onModuleDestroy does not throw', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('getTenantSubscription throws NotFoundException when no row', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({ select: () => makeChain([]) } as Parameters<typeof fn>[0])
    );
    await expect(service.getTenantSubscription('tenant-1', CTX)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('isPilotActive returns false when no subscription', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(new NotFoundException());
    const result = await service.isPilotActive('tenant-1', CTX);
    expect(result).toBe(false);
  });

  it('isPilotActive returns true when pilot and future end date', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    const futureDate = new Date(Date.now() + 86400_000);
    vi.mocked(withTenantContext).mockResolvedValueOnce({
      status: 'pilot',
      pilotEndsAt: futureDate,
      plan: {},
    } as unknown as Awaited<ReturnType<typeof service.getTenantSubscription>>);
    const result = await service.isPilotActive('tenant-1', CTX);
    expect(result).toBe(true);
  });

  it('isPilotExpired returns true when pilot and past end date', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    const pastDate = new Date(Date.now() - 86400_000);
    vi.mocked(withTenantContext).mockResolvedValueOnce({
      status: 'pilot',
      pilotEndsAt: pastDate,
      plan: {},
    } as unknown as Awaited<ReturnType<typeof service.getTenantSubscription>>);
    const result = await service.isPilotExpired('tenant-1', CTX);
    expect(result).toBe(true);
  });

  it('getSubscriptionStatus returns TRIALING on error', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(new Error('no sub'));
    const status = await service.getSubscriptionStatus('tenant-1', CTX);
    expect(status).toBe('TRIALING');
  });

  it('createPilotSubscription calls withTenantContext', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    const pilotEndsAt = new Date(Date.now() + 90 * 86400_000);
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) => {
      const row = { id: 'sub-1', status: 'pilot', tenantId: 'tenant-1', planId: 'plan-1' };
      const tx = {
        insert: () => ({ values: () => ({ returning: async () => [row] }) }),
      };
      return fn(tx as Parameters<typeof fn>[0]);
    });
    const result = await service.createPilotSubscription('tenant-1', 'plan-1', pilotEndsAt, CTX);
    expect(result).toHaveProperty('status', 'pilot');
    expect(withTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.any(Function)
    );
  });
});
