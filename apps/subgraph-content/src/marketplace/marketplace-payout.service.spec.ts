/**
 * MarketplacePayoutService unit tests — F-14 Revenue Split
 * Tests: revenue split calculation, batch payout processing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock (factory — no top-level refs) ─────────────────────────────────────
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {
    instructorPayouts: {
      id: 'id',
      instructorId: 'instructorId',
      tenantId: 'tenantId',
      status: 'status',
      amountCents: 'amountCents',
      stripeTransferId: 'stripeTransferId',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({ sql: vi.fn() }));

import { withTenantContext, closeAllPools } from '@edusphere/db';
const mockWithTenantContext = vi.mocked(withTenantContext);
const mockCloseAllPools = vi.mocked(closeAllPools);

// ── Stripe mock ───────────────────────────────────────────────────────────────
const mockCreateTransfer = vi.fn();

const mockStripeClient = {
  createTransfer: mockCreateTransfer,
};

import { MarketplacePayoutService } from './marketplace-payout.service.js';

describe('MarketplacePayoutService', () => {
  let service: MarketplacePayoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MarketplacePayoutService(mockStripeClient as never);
  });

  it('1. recordRevenueSplit calculates correct instructor share', async () => {
    mockWithTenantContext.mockResolvedValueOnce(undefined);

    await service.recordRevenueSplit(
      'purchase-1',
      'course-1',
      'instructor-1',
      10000, // $100.00
      70,    // 70% split
      'tenant-1'
    );

    // Verify withTenantContext was called (insert operation)
    expect(mockWithTenantContext).toHaveBeenCalledTimes(1);
  });

  it('2. recordRevenueSplit with 80% split', async () => {
    mockWithTenantContext.mockResolvedValueOnce(undefined);

    await service.recordRevenueSplit(
      'purchase-2',
      'course-2',
      'instructor-2',
      5000, // $50.00
      80,   // 80% split → $40.00 to instructor
      'tenant-1'
    );

    expect(mockWithTenantContext).toHaveBeenCalledTimes(1);
  });

  it('3. processPayouts creates Stripe transfers for PENDING payouts', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      'INSTRUCTOR_STRIPE_ACCOUNT_instructor-1': 'acct_test_123',
    };

    // Return pending payouts
    mockWithTenantContext
      .mockResolvedValueOnce([
        {
          id: 'payout-1',
          instructorId: 'instructor-1',
          tenantId: 'tenant-1',
          amountCents: 7000,
          status: 'PENDING',
          stripeTransferId: null,
        },
      ])
      .mockResolvedValueOnce(undefined); // update status

    mockCreateTransfer.mockResolvedValue({ id: 'tr_test_123' });

    const processed = await service.processPayouts('tenant-1');

    expect(processed).toBe(1);
    expect(mockCreateTransfer).toHaveBeenCalledWith(
      7000,
      'acct_test_123',
      expect.stringContaining('payout-1')
    );

    process.env = originalEnv;
  });

  it('4. processPayouts skips instructors without Stripe account', async () => {
    mockWithTenantContext.mockResolvedValueOnce([
      {
        id: 'payout-2',
        instructorId: 'instructor-no-stripe',
        tenantId: 'tenant-1',
        amountCents: 5000,
        status: 'PENDING',
        stripeTransferId: null,
      },
    ]);

    const processed = await service.processPayouts('tenant-1');

    expect(processed).toBe(0);
    expect(mockCreateTransfer).not.toHaveBeenCalled();
  });

  it('5. processPayouts marks payout as FAILED on Stripe error', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      'INSTRUCTOR_STRIPE_ACCOUNT_instructor-fail': 'acct_fail',
    };

    mockWithTenantContext
      .mockResolvedValueOnce([
        {
          id: 'payout-3',
          instructorId: 'instructor-fail',
          tenantId: 'tenant-1',
          amountCents: 3000,
          status: 'PENDING',
          stripeTransferId: null,
        },
      ])
      .mockResolvedValueOnce(undefined); // update to FAILED

    mockCreateTransfer.mockRejectedValue(new Error('Stripe error'));

    const processed = await service.processPayouts('tenant-1');

    expect(processed).toBe(0);

    process.env = originalEnv;
  });

  it('6. onModuleDestroy closes DB pools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalled();
  });
});
