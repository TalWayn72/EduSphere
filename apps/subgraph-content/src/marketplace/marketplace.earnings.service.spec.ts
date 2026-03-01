/**
 * MarketplaceEarningsService unit tests — F-031 Instructor Marketplace
 * 14 tests covering earnings calculation, payout logic, and DB interactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: mockWithTenantContext,
  schema: {
    purchases: {
      id: 'id',
      courseId: 'courseId',
      userId: 'userId',
      tenantId: 'tenantId',
      amountCents: 'amountCents',
      status: 'status',
      purchasedAt: 'purchasedAt',
      stripePaymentIntentId: 'stripePaymentIntentId',
    },
    courseListings: {
      courseId: 'courseId',
      tenantId: 'tenantId',
      revenueSplitPercent: 'revenueSplitPercent',
    },
    courses: {
      id: 'id',
      instructor_id: 'instructor_id',
    },
    instructorPayouts: {
      id: 'id',
      instructorId: 'instructorId',
      tenantId: 'tenantId',
      amountCents: 'amountCents',
      status: 'status',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn((parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce(
      (acc: string, part: string, i: number) =>
        acc + part + (values[i] !== undefined ? String(values[i]) : ''),
      ''
    )
  ),
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn((parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce(
      (acc: string, part: string, i: number) =>
        acc + part + (values[i] !== undefined ? String(values[i]) : ''),
      ''
    )
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { MarketplaceEarningsService } from './marketplace.earnings.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const INSTRUCTOR_ID = 'instructor-abc';

const mockStripeClient = {
  createTransfer: vi.fn(),
};

// Default purchase row matching the join query return shape
function makePurchaseRow(overrides: Partial<{
  purchaseId: string;
  courseId: string;
  amountCents: number;
  status: string;
  purchasedAt: Date;
  userId: string;
  tenantId: string;
  stripePaymentIntentId: string | null;
  revenueSplitPercent: number;
}> = {}) {
  return {
    purchaseId: overrides.purchaseId ?? 'purchase-1',
    courseId: overrides.courseId ?? 'course-x',
    amountCents: overrides.amountCents ?? 10000,
    status: overrides.status ?? 'COMPLETE',
    purchasedAt: overrides.purchasedAt ?? new Date('2025-01-01'),
    userId: overrides.userId ?? 'student-1',
    tenantId: overrides.tenantId ?? TENANT_ID,
    stripePaymentIntentId: overrides.stripePaymentIntentId ?? 'pi_123',
    revenueSplitPercent: overrides.revenueSplitPercent ?? 70,
  };
}

function makePayoutRow(overrides: Partial<{
  id: string;
  instructorId: string;
  tenantId: string;
  amountCents: number;
  status: string;
  stripeTransferId: string | null;
  periodStart: Date;
  periodEnd: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'payout-1',
    instructorId: overrides.instructorId ?? INSTRUCTOR_ID,
    tenantId: overrides.tenantId ?? TENANT_ID,
    amountCents: overrides.amountCents ?? 7000,
    status: overrides.status ?? 'PAID',
    stripeTransferId: overrides.stripeTransferId ?? 'tr_abc',
    periodStart: overrides.periodStart ?? new Date('2025-01-01'),
    periodEnd: overrides.periodEnd ?? new Date('2025-01-31'),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplaceEarningsService', () => {
  let svc: MarketplaceEarningsService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new MarketplaceEarningsService();
  });

  // ── Construction ──────────────────────────────────────────────────────────

  // Test 1
  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(MarketplaceEarningsService);
  });

  // Test 2
  it('has no onModuleDestroy — not needed as it only uses DB from shared pool', () => {
    expect(
      typeof (svc as Record<string, unknown>)['onModuleDestroy']
    ).toBe('undefined');
  });

  // ── getInstructorEarnings ─────────────────────────────────────────────────

  // Test 3
  it('getInstructorEarnings returns zero totals when instructor has no purchases', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([])  // purchase rows (empty)
      .mockResolvedValueOnce([]); // payout rows (empty)

    const result = await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    expect(result.totalEarnedCents).toBe(0);
    expect(result.pendingPayoutCents).toBe(0);
    expect(result.paidOutCents).toBe(0);
    expect(result.purchases).toHaveLength(0);
  });

  // Test 4
  it('getInstructorEarnings calculates totalEarnedCents using revenueSplitPercent', async () => {
    // 10000 cents * 70% = 7000 cents earned
    const purchase = makePurchaseRow({ amountCents: 10000, revenueSplitPercent: 70 });
    mockWithTenantContext
      .mockResolvedValueOnce([purchase])
      .mockResolvedValueOnce([]); // no payouts yet

    const result = await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    expect(result.totalEarnedCents).toBe(7000);
  });

  // Test 5
  it('getInstructorEarnings uses default 70% split when revenueSplitPercent is null', async () => {
    const purchase = makePurchaseRow({ amountCents: 5000, revenueSplitPercent: undefined });
    // Override with null revenueSplitPercent
    const rowWithNull = { ...purchase, revenueSplitPercent: null };
    mockWithTenantContext
      .mockResolvedValueOnce([rowWithNull])
      .mockResolvedValueOnce([]);

    const result = await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    // 5000 * 70% = 3500
    expect(result.totalEarnedCents).toBe(3500);
  });

  // Test 6
  it('getInstructorEarnings calculates pendingPayoutCents as totalEarned minus paidOut', async () => {
    const purchase = makePurchaseRow({ amountCents: 20000, revenueSplitPercent: 70 });
    // totalEarned = 14000 cents
    const paidPayout = makePayoutRow({ amountCents: 7000, status: 'PAID' });
    mockWithTenantContext
      .mockResolvedValueOnce([purchase])
      .mockResolvedValueOnce([paidPayout]);

    const result = await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    expect(result.totalEarnedCents).toBe(14000);
    expect(result.paidOutCents).toBe(7000);
    expect(result.pendingPayoutCents).toBe(7000);
  });

  // Test 7
  it('getInstructorEarnings returns purchases with correct shape', async () => {
    const purchase = makePurchaseRow();
    mockWithTenantContext
      .mockResolvedValueOnce([purchase])
      .mockResolvedValueOnce([]);

    const result = await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    expect(result.purchases).toHaveLength(1);
    const p = result.purchases[0]!;
    expect(p.id).toBe('purchase-1');
    expect(p.amountCents).toBe(10000);
    expect(p.tenantId).toBe(TENANT_ID);
  });

  // Test 8
  it('getInstructorEarnings only counts PAID payouts in paidOutCents', async () => {
    const purchase = makePurchaseRow({ amountCents: 10000, revenueSplitPercent: 70 });
    const pendingPayout = makePayoutRow({ amountCents: 5000, status: 'PENDING' });
    const paidPayout = makePayoutRow({ amountCents: 2000, status: 'PAID' });

    mockWithTenantContext
      .mockResolvedValueOnce([purchase])
      .mockResolvedValueOnce([pendingPayout, paidPayout]);

    const result = await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    // Only PAID payout contributes to paidOutCents
    expect(result.paidOutCents).toBe(2000);
    // totalEarned = 7000, paidOut = 2000, pending = 5000
    expect(result.pendingPayoutCents).toBe(5000);
  });

  // Test 9
  it('getInstructorEarnings calls withTenantContext twice (purchases + payouts)', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    expect(mockWithTenantContext).toHaveBeenCalledTimes(2);
  });

  // Test 10
  it('getInstructorEarnings passes INSTRUCTOR role in tenant context', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await svc.getInstructorEarnings(INSTRUCTOR_ID, TENANT_ID);
    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: TENANT_ID,
        userId: INSTRUCTOR_ID,
        userRole: 'INSTRUCTOR',
      }),
      expect.any(Function)
    );
  });

  // ── requestPayout ─────────────────────────────────────────────────────────

  // Test 11
  it('requestPayout throws BadRequestException when no pending earnings', async () => {
    // Each requestPayout call delegates to getInstructorEarnings (2 withTenantContext calls each)
    // Set up 4 calls: 2 for first requestPayout + 2 for second requestPayout
    mockWithTenantContext
      .mockResolvedValueOnce([])   // 1st call: purchases (empty)
      .mockResolvedValueOnce([])   // 1st call: payouts (empty)
      .mockResolvedValueOnce([])   // 2nd call: purchases (empty)
      .mockResolvedValueOnce([]);  // 2nd call: payouts (empty)

    await expect(
      svc.requestPayout(INSTRUCTOR_ID, TENANT_ID, mockStripeClient as never)
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.requestPayout(INSTRUCTOR_ID, TENANT_ID, mockStripeClient as never)
    ).rejects.toThrow('No pending earnings available for payout');
  });

  // Test 12
  it('requestPayout creates Stripe transfer when instructor has a Stripe account', async () => {
    // Set env variable for this test
    process.env[`INSTRUCTOR_STRIPE_ACCOUNT_${INSTRUCTOR_ID}`] = 'acct_test_123';

    const purchase = makePurchaseRow({ amountCents: 10000, revenueSplitPercent: 70 });
    // totalEarned = 7000, paidOut = 0, pending = 7000
    mockWithTenantContext
      .mockResolvedValueOnce([purchase])       // purchases (for getInstructorEarnings)
      .mockResolvedValueOnce([])               // payouts (for getInstructorEarnings)
      .mockResolvedValueOnce([makePayoutRow({ status: 'PAID', amountCents: 7000 })]); // insert payout

    mockStripeClient.createTransfer.mockResolvedValue({ id: 'tr_new_transfer' });

    const result = await svc.requestPayout(INSTRUCTOR_ID, TENANT_ID, mockStripeClient as never);
    expect(mockStripeClient.createTransfer).toHaveBeenCalledWith(
      7000,
      'acct_test_123',
      expect.stringContaining(INSTRUCTOR_ID)
    );
    expect(result).toBeDefined();

    // Cleanup env
    delete process.env[`INSTRUCTOR_STRIPE_ACCOUNT_${INSTRUCTOR_ID}`];
  });

  // Test 13
  it('requestPayout records PENDING status when no Stripe account configured', async () => {
    // Ensure no stripe account env var
    delete process.env[`INSTRUCTOR_STRIPE_ACCOUNT_${INSTRUCTOR_ID}`];

    const purchase = makePurchaseRow({ amountCents: 10000, revenueSplitPercent: 70 });
    const pendingPayoutRow = makePayoutRow({ status: 'PENDING', stripeTransferId: null, amountCents: 7000 });

    mockWithTenantContext
      .mockResolvedValueOnce([purchase])     // purchases
      .mockResolvedValueOnce([])             // payouts (none paid)
      .mockResolvedValueOnce([pendingPayoutRow]); // insert payout

    const result = await svc.requestPayout(INSTRUCTOR_ID, TENANT_ID, mockStripeClient as never);
    expect(mockStripeClient.createTransfer).not.toHaveBeenCalled();
    expect(result.status).toBe('PENDING');
  });

  // Test 14
  it('requestPayout persists payout with correct amountCents equal to pendingPayoutCents', async () => {
    delete process.env[`INSTRUCTOR_STRIPE_ACCOUNT_${INSTRUCTOR_ID}`];

    const purchase = makePurchaseRow({ amountCents: 5000, revenueSplitPercent: 80 });
    // totalEarned = 4000, no prior payouts, pending = 4000
    let capturedAmount: number | undefined;

    mockWithTenantContext
      .mockResolvedValueOnce([purchase])   // purchases
      .mockResolvedValueOnce([])           // payouts
      .mockImplementationOnce(
        (_db: unknown, _ctx: unknown, fn: (tx: {
          insert: () => {
            values: (v: Record<string, unknown>) => {
              returning: () => Array<Record<string, unknown>>;
            };
          };
        }) => unknown) =>
          fn({
            insert: () => ({
              values: (v: Record<string, unknown>) => {
                capturedAmount = v['amountCents'] as number;
                return {
                  returning: () => [{
                    id: 'po-new', instructorId: INSTRUCTOR_ID, tenantId: TENANT_ID,
                    amountCents: capturedAmount, status: 'PENDING',
                    stripeTransferId: null, periodStart: new Date(), periodEnd: new Date(),
                  }],
                };
              },
            }),
          })
      );

    await svc.requestPayout(INSTRUCTOR_ID, TENANT_ID, mockStripeClient as never);
    expect(capturedAmount).toBe(4000);
  });
});
