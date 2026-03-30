import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MarketplacePurchaseService } from './marketplace-purchase.service';

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  schema: {
    purchases: {
      userId: 'user_id',
      courseId: 'course_id',
      tenantId: 'tenant_id',
      status: 'status',
      stripePaymentIntentId: 'stripe_payment_intent_id',
    },
    courseListings: {
      courseId: 'course_id',
      tenantId: 'tenant_id',
      isPublished: 'is_published',
    },
    stripeCustomers: {
      userId: 'user_id',
      tenantId: 'tenant_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn(),
}));

vi.mock('nats', () => ({
  StringCodec: vi.fn(() => ({ encode: vi.fn((s) => s) })),
}));

const mockStripeClient = {
  createPaymentIntent: vi.fn(),
  createCustomer: vi.fn(),
};

function makeSelectChain(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('MarketplacePurchaseService', () => {
  let service: MarketplacePurchaseService;
  const mockDb = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MarketplacePurchaseService(mockStripeClient as any);
  });

  describe('purchaseCourse()', () => {
    it('throws BadRequestException when course already purchased', async () => {
      const chain = makeSelectChain([{ id: 'existing-purchase' }]);
      mockTx.select.mockReturnValue({ from: chain.from });

      await expect(
        service.purchaseCourse(mockDb, 'c1', 'u1', 't1', 'e@e.com', 'User'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when listing not found', async () => {
      // First select: no existing purchase
      const chain1 = makeSelectChain([]);
      // Second select: no listing
      const chain2 = makeSelectChain([]);
      mockTx.select
        .mockReturnValueOnce({ from: chain1.from })
        .mockReturnValueOnce({ from: chain2.from });

      await expect(
        service.purchaseCourse(mockDb, 'c1', 'u1', 't1', 'e@e.com', 'User'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates payment intent and returns client secret', async () => {
      // No existing purchase
      const chain1 = makeSelectChain([]);
      // Listing found
      const chain2 = makeSelectChain([{
        courseId: 'c1', tenantId: 't1', isPublished: true,
        priceCents: 4999, currency: 'usd',
      }]);
      // Existing stripe customer
      const chain3 = makeSelectChain([{ stripeCustomerId: 'cus_123' }]);
      mockTx.select
        .mockReturnValueOnce({ from: chain1.from })
        .mockReturnValueOnce({ from: chain2.from })
        .mockReturnValueOnce({ from: chain3.from });

      mockStripeClient.createPaymentIntent.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'secret_abc',
      });

      const mockValues = vi.fn().mockResolvedValue(undefined);
      mockTx.insert.mockReturnValue({ values: mockValues });

      const result = await service.purchaseCourse(
        mockDb, 'c1', 'u1', 't1', 'e@e.com', 'User',
      );
      expect(result.clientSecret).toBe('secret_abc');
      expect(result.paymentIntentId).toBe('pi_123');
    });

    it('creates new Stripe customer when none exists', async () => {
      const chain1 = makeSelectChain([]);
      const chain2 = makeSelectChain([{
        courseId: 'c1', priceCents: 999, currency: 'usd',
        tenantId: 't1', isPublished: true,
      }]);
      // No existing customer
      const chain3 = makeSelectChain([]);
      mockTx.select
        .mockReturnValueOnce({ from: chain1.from })
        .mockReturnValueOnce({ from: chain2.from })
        .mockReturnValueOnce({ from: chain3.from });

      mockStripeClient.createCustomer.mockResolvedValue({ id: 'cus_new' });
      mockStripeClient.createPaymentIntent.mockResolvedValue({
        id: 'pi_456', client_secret: 'sec_xyz',
      });

      const mockValues = vi.fn().mockResolvedValue(undefined);
      mockTx.insert.mockReturnValue({ values: mockValues });

      const result = await service.purchaseCourse(
        mockDb, 'c1', 'u1', 't1', 'e@e.com', 'User',
      );
      expect(mockStripeClient.createCustomer).toHaveBeenCalledWith(
        'e@e.com', 'User',
      );
      expect(result.paymentIntentId).toBe('pi_456');
    });
  });

  describe('processWebhook()', () => {
    const getNats = vi.fn();

    it('marks purchase COMPLETE on payment_intent.succeeded', async () => {
      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockTx.update.mockReturnValue({ set: mockSet });

      // For publishEnrollmentEvent internal select
      const chain = makeSelectChain([{
        id: 'pur1', courseId: 'c1', userId: 'u1', tenantId: 't1',
      }]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const mockNc = { publish: vi.fn() };
      getNats.mockResolvedValue(mockNc);

      await service.processWebhook(
        mockDb,
        { type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } } as any,
        't1',
        getNats,
      );
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('marks purchase FAILED on payment_intent.payment_failed', async () => {
      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockTx.update.mockReturnValue({ set: mockSet });

      await service.processWebhook(
        mockDb,
        { type: 'payment_intent.payment_failed', data: { object: { id: 'pi_2' } } } as any,
        't1',
        getNats,
      );
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('ignores unrelated event types', async () => {
      await service.processWebhook(
        mockDb,
        { type: 'charge.refunded', data: { object: {} } } as any,
        't1',
        getNats,
      );
      expect(mockTx.update).not.toHaveBeenCalled();
    });
  });

  describe('getUserPurchases()', () => {
    it('returns list of user purchases', async () => {
      const purchases = [
        { id: 'p1', courseId: 'c1', status: 'COMPLETE' },
        { id: 'p2', courseId: 'c2', status: 'PENDING' },
      ];
      const chain = makeSelectChain(purchases);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getUserPurchases(mockDb, 'u1', 't1');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no purchases', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const result = await service.getUserPurchases(mockDb, 'u1', 't1');
      expect(result).toEqual([]);
    });
  });
});
