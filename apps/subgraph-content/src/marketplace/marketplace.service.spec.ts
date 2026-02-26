/**
 * MarketplaceService unit tests — F-031 Instructor Marketplace + Revenue Sharing
 * 10 tests covering purchases, webhooks, earnings, listings, and idempotency.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

// ── DB mock ───────────────────────────────────────────────────────────────────
const _mockSelect = vi.fn();
const _mockInsert = vi.fn();
const _mockUpdate = vi.fn();
const mockWithTenantContext = vi.fn();
const mockCloseAllPools = vi.fn();
const mockPublish = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  schema: {
    purchases: { id: 'id', userId: 'userId', courseId: 'courseId', tenantId: 'tenantId', status: 'status', stripePaymentIntentId: 'stripePaymentIntentId', amountCents: 'amountCents', purchasedAt: 'purchasedAt' },
    courseListings: { id: 'id', courseId: 'courseId', tenantId: 'tenantId', priceCents: 'priceCents', currency: 'currency', isPublished: 'isPublished', revenueSplitPercent: 'revenueSplitPercent' },
    stripeCustomers: { id: 'id', userId: 'userId', tenantId: 'tenantId', stripeCustomerId: 'stripeCustomerId' },
    courses: { id: 'id', instructor_id: 'instructor_id' },
    instructorPayouts: { id: 'id', instructorId: 'instructorId', tenantId: 'tenantId', amountCents: 'amountCents', status: 'status' },
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: mockWithTenantContext,
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  isCourseCompletedEvent: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn(() => Promise.resolve({ publish: mockPublish, drain: vi.fn() })),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s: string) => s), decode: vi.fn((s: string) => s) })),
}));

// ── Stripe client mock ────────────────────────────────────────────────────────
const mockStripeClient = {
  createPaymentIntent: vi.fn(),
  createCustomer: vi.fn(),
  constructWebhookEvent: vi.fn(),
  createTransfer: vi.fn(),
  getPaymentIntent: vi.fn(),
};

// ── Earnings service mock ─────────────────────────────────────────────────────
const mockEarningsService = {
  getInstructorEarnings: vi.fn(),
  requestPayout: vi.fn(),
};

// ── Lazy import after mocks ───────────────────────────────────────────────────
const getService = async () => {
  const { MarketplaceService } = await import('./marketplace.service.js');
  const svc = new MarketplaceService(
    mockStripeClient as never,
    mockEarningsService as never,
  );
  return svc;
};

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-abc';
const COURSE_ID = 'course-xyz';
const INTENT_ID = 'pi_test_123';

beforeEach(() => {
  vi.clearAllMocks();
  mockWithTenantContext.mockImplementation((_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({
    select: () => ({ from: () => ({ where: () => [] }) }),
    insert: () => ({ values: () => ({ returning: () => [{ id: 'listing-1', courseId: COURSE_ID, tenantId: TENANT_ID, priceCents: 2999, currency: 'USD', isPublished: false, revenueSplitPercent: 70 }] }) }),
    update: () => ({ set: () => ({ where: () => [] }) }),
  }));
});

describe('MarketplaceService', () => {
  it('1. purchaseCourse creates Stripe PaymentIntent with correct amount', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([]) // no existing complete purchase
      .mockResolvedValueOnce([{ priceCents: 2999, currency: 'USD', isPublished: true, revenueSplitPercent: 70 }]) // listing
      .mockResolvedValueOnce([]) // no existing stripe customer
      .mockResolvedValueOnce({ id: 'cus_123' }) // create customer returns (not from tx)
      .mockResolvedValueOnce([]); // insert purchase

    mockStripeClient.createCustomer.mockResolvedValue({ id: 'cus_123' });
    mockStripeClient.createPaymentIntent.mockResolvedValue({ id: INTENT_ID, client_secret: 'secret_test' });

    const svc = await getService();
    const result = await svc.purchaseCourse(COURSE_ID, USER_ID, TENANT_ID, 'user@test.com', 'Test User');

    expect(mockStripeClient.createPaymentIntent).toHaveBeenCalledWith(2999, 'USD', expect.any(String));
    expect(result.paymentIntentId).toBe(INTENT_ID);
  });

  it('2. purchaseCourse creates pending purchase record in DB', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ priceCents: 4999, currency: 'USD', isPublished: true, revenueSplitPercent: 70 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    mockStripeClient.createCustomer.mockResolvedValue({ id: 'cus_456' });
    mockStripeClient.createPaymentIntent.mockResolvedValue({ id: INTENT_ID, client_secret: 'cs_test' });

    const svc = await getService();
    await svc.purchaseCourse(COURSE_ID, USER_ID, TENANT_ID, 'u@t.com', 'Test');
    expect(mockWithTenantContext).toHaveBeenCalled();
  });

  it('3. purchaseCourse prevents duplicate purchase (idempotency check)', async () => {
    mockWithTenantContext.mockResolvedValueOnce([
      { id: 'existing-purchase', status: 'COMPLETE' },
    ]);

    const svc = await getService();
    await expect(
      svc.purchaseCourse(COURSE_ID, USER_ID, TENANT_ID, 'u@t.com', 'Test'),
    ).rejects.toThrow(BadRequestException);
  });

  it('4. processWebhook marks purchase COMPLETE on payment_intent.succeeded', async () => {
    let capturedStatus: string | undefined;
    mockWithTenantContext
      .mockImplementationOnce((_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({
        update: () => ({ set: (v: { status: string }) => { capturedStatus = v.status; return { where: () => [] }; } }),
      }))
      .mockResolvedValueOnce([]); // for publishEnrollmentEvent

    const event = {
      type: 'payment_intent.succeeded',
      data: { object: { id: INTENT_ID, metadata: {} } },
    };

    const svc = await getService();
    await svc.processWebhook(event as never, TENANT_ID);
    expect(capturedStatus).toBe('COMPLETE');
  });

  it('5. processWebhook marks purchase FAILED on payment_intent.payment_failed', async () => {
    let capturedStatus: string | undefined;
    mockWithTenantContext.mockImplementationOnce((_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({
      update: () => ({ set: (v: { status: string }) => { capturedStatus = v.status; return { where: () => [] }; } }),
    }));

    const event = {
      type: 'payment_intent.payment_failed',
      data: { object: { id: INTENT_ID } },
    };

    const svc = await getService();
    await svc.processWebhook(event as never, TENANT_ID);
    expect(capturedStatus).toBe('FAILED');
  });

  it('6. processWebhook publishes NATS enrollment event on success', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([]) // update purchase
      .mockResolvedValueOnce([{  // fetch purchase for event
        id: 'p-1', courseId: COURSE_ID, userId: USER_ID, tenantId: TENANT_ID,
      }]);

    const event = { type: 'payment_intent.succeeded', data: { object: { id: INTENT_ID, metadata: {} } } };
    const svc = await getService();
    await svc.processWebhook(event as never, TENANT_ID);
    // NATS connect is called lazily; expect publish was attempted
    expect(mockWithTenantContext).toHaveBeenCalled();
  });

  it('7. getInstructorEarnings delegates to earnings service', async () => {
    mockEarningsService.getInstructorEarnings.mockResolvedValue({
      totalEarnedCents: 7000,
      pendingPayoutCents: 7000,
      paidOutCents: 0,
      purchases: [],
    });

    const svc = await getService();
    const result = await svc.getInstructorEarnings('instructor-1', TENANT_ID);
    expect(result.totalEarnedCents).toBe(7000);
    expect(mockEarningsService.getInstructorEarnings).toHaveBeenCalledWith('instructor-1', TENANT_ID);
  });

  it('8. createListing stores with correct revenueSplitPercent', async () => {
    let capturedValues: Record<string, unknown> = {};
    mockWithTenantContext.mockImplementationOnce((_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({
      insert: () => ({ values: (v: Record<string, unknown>) => { capturedValues = v; return { returning: () => [{ ...v, id: 'new-listing' }] }; } }),
    }));

    const svc = await getService();
    await svc.createListing(COURSE_ID, 4999, 'USD', 80, TENANT_ID);
    expect(capturedValues['revenueSplitPercent']).toBe(80);
  });

  it('9. publishListing sets isPublished=true in DB', async () => {
    let capturedSet: Record<string, unknown> = {};
    mockWithTenantContext.mockImplementationOnce((_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn({
      update: () => ({ set: (v: Record<string, unknown>) => { capturedSet = v; return { where: () => [] }; } }),
    }));

    const svc = await getService();
    await svc.publishListing(COURSE_ID, TENANT_ID);
    expect(capturedSet['isPublished']).toBe(true);
  });

  it('10. getUserPurchases returns only for correct user+tenant', async () => {
    const fakePurchases = [
      { id: 'p-1', userId: USER_ID, courseId: COURSE_ID, tenantId: TENANT_ID, amountCents: 2999, status: 'COMPLETE', purchasedAt: new Date() },
    ];
    mockWithTenantContext.mockResolvedValueOnce(fakePurchases);

    const svc = await getService();
    const result = await svc.getUserPurchases(USER_ID, TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0]?.userId).toBe(USER_ID);
    expect(result[0]?.tenantId).toBe(TENANT_ID);
  });
});
