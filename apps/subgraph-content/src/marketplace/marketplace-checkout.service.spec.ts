/**
 * MarketplaceCheckoutService unit tests — F-14 Content Marketplace
 * Tests: checkout session creation, refund window, graceful degradation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ── DB mock (factory — no top-level refs) ─────────────────────────────────────
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {
    courseListings: {
      id: 'id',
      courseId: 'courseId',
      priceCents: 'priceCents',
      currency: 'currency',
      isPublished: 'isPublished',
      revenueSplitPercent: 'revenueSplitPercent',
    },
    courses: { id: 'id', title: 'title' },
    purchases: {
      id: 'id',
      courseId: 'courseId',
      tenantId: 'tenantId',
      status: 'status',
      stripePaymentIntentId: 'stripePaymentIntentId',
      amountCents: 'amountCents',
      purchasedAt: 'purchasedAt',
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
const mockCreateCheckoutSession = vi.fn();
const mockCreateRefund = vi.fn();

const mockStripeClient = {
  createCheckoutSession: mockCreateCheckoutSession,
  createRefund: mockCreateRefund,
};

import { MarketplaceCheckoutService } from './marketplace-checkout.service.js';

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'ORG_ADMIN' as const,
};

describe('MarketplaceCheckoutService', () => {
  let service: MarketplaceCheckoutService;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    service = new MarketplaceCheckoutService(mockStripeClient as never);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── createCheckoutSession ─────────────────────────────────────

  it('1. creates checkout session with correct Stripe params', async () => {
    const mockListing = {
      id: 'listing-1',
      courseId: 'course-1',
      priceCents: 4999,
      currency: 'USD',
      isPublished: true,
      revenueSplitPercent: 70,
    };

    // First call: listing lookup; Second call: course title lookup
    mockWithTenantContext
      .mockResolvedValueOnce([mockListing])
      .mockResolvedValueOnce([{ title: 'Advanced TypeScript' }]);

    process.env['STRIPE_SECRET_KEY'] = 'sk_test_mock';

    mockCreateCheckoutSession.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/session/cs_test_123',
    });

    const result = await service.createCheckoutSession('listing-1', TENANT_CTX);

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            name: 'Advanced TypeScript',
            amountCents: 4999,
            currency: 'usd',
          }),
        ]),
        metadata: expect.objectContaining({
          listingId: 'listing-1',
          tenantId: 'tenant-1',
        }),
      })
    );
    expect(result.sessionUrl).toContain('checkout.stripe.com');
    expect(result.sessionId).toBe('cs_test_123');
  });

  it('2. returns mock session URL when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env['STRIPE_SECRET_KEY'];

    mockWithTenantContext
      .mockResolvedValueOnce([
        {
          id: 'listing-1',
          courseId: 'course-1',
          priceCents: 2999,
          currency: 'USD',
          isPublished: true,
          revenueSplitPercent: 70,
        },
      ])
      .mockResolvedValueOnce([{ title: 'Test Course' }]);

    const result = await service.createCheckoutSession('listing-1', TENANT_CTX);

    expect(result.sessionUrl).toContain('/admin/marketplace/success');
    expect(result.sessionId).toMatch(/^mock_cs_/);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it('3. throws NotFoundException for unpublished listing', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await expect(
      service.createCheckoutSession('nonexistent', TENANT_CTX)
    ).rejects.toThrow(NotFoundException);
  });

  // ── requestRefund ─────────────────────────────────────────────

  it('4. refunds purchase within 14-day window', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

    mockWithTenantContext
      .mockResolvedValueOnce([
        {
          id: 'purchase-1',
          courseId: 'course-1',
          tenantId: 'tenant-1',
          status: 'COMPLETE',
          stripePaymentIntentId: 'pi_test_123',
          amountCents: 4999,
          purchasedAt: recentDate,
        },
      ])
      .mockResolvedValueOnce(undefined) // update
      .mockResolvedValueOnce([{ title: 'Test Course' }]); // course title

    process.env['STRIPE_SECRET_KEY'] = 'sk_test_mock';
    mockCreateRefund.mockResolvedValue({ id: 're_test_123' });

    const result = await service.requestRefund('purchase-1', TENANT_CTX);

    expect(result.status).toBe('REFUNDED');
    expect(mockCreateRefund).toHaveBeenCalledWith('pi_test_123');
  });

  it('5. rejects refund after 14-day window', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 15); // 15 days ago

    mockWithTenantContext.mockResolvedValueOnce([
      {
        id: 'purchase-1',
        courseId: 'course-1',
        tenantId: 'tenant-1',
        status: 'COMPLETE',
        stripePaymentIntentId: 'pi_test_123',
        amountCents: 4999,
        purchasedAt: oldDate,
      },
    ]);

    await expect(
      service.requestRefund('purchase-1', TENANT_CTX)
    ).rejects.toThrow(BadRequestException);
  });

  it('6. rejects refund for already-refunded purchase', async () => {
    mockWithTenantContext.mockResolvedValueOnce([
      {
        id: 'purchase-1',
        courseId: 'course-1',
        tenantId: 'tenant-1',
        status: 'REFUNDED',
        stripePaymentIntentId: 'pi_test_123',
        amountCents: 4999,
        purchasedAt: new Date(),
      },
    ]);

    await expect(
      service.requestRefund('purchase-1', TENANT_CTX)
    ).rejects.toThrow(BadRequestException);
  });

  it('7. refund within 13 days succeeds', async () => {
    const thirteenDaysAgo = new Date();
    thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);

    mockWithTenantContext
      .mockResolvedValueOnce([
        {
          id: 'purchase-2',
          courseId: 'course-2',
          tenantId: 'tenant-1',
          status: 'COMPLETE',
          stripePaymentIntentId: 'pi_test_456',
          amountCents: 1999,
          purchasedAt: thirteenDaysAgo,
        },
      ])
      .mockResolvedValueOnce(undefined) // update
      .mockResolvedValueOnce([{ title: 'Course 2' }]); // title

    process.env['STRIPE_SECRET_KEY'] = 'sk_test_mock';
    mockCreateRefund.mockResolvedValue({ id: 're_test_456' });

    const result = await service.requestRefund('purchase-2', TENANT_CTX);
    expect(result.status).toBe('REFUNDED');
  });

  // ── onModuleDestroy ───────────────────────────────────────────

  it('8. onModuleDestroy closes DB pools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalled();
  });
});
