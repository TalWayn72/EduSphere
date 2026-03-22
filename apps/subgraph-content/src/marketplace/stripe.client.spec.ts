/**
 * StripeClient unit tests — F-031 Instructor Marketplace + Revenue Sharing
 * 6 tests covering Stripe SDK delegation and config validation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock Stripe SDK ───────────────────────────────────────────────────────────
const mockPaymentIntentsCreate = vi.fn();
const mockCustomersCreate = vi.fn();
const mockTransfersCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();
const mockPaymentIntentsRetrieve = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();
const mockCheckoutSessionsRetrieve = vi.fn();
const mockRefundsCreate = vi.fn();

vi.mock('stripe', () => {
  function MockStripe() {
    return {
      paymentIntents: {
        create: mockPaymentIntentsCreate,
        retrieve: mockPaymentIntentsRetrieve,
      },
      customers: {
        create: mockCustomersCreate,
      },
      transfers: {
        create: mockTransfersCreate,
      },
      webhooks: {
        constructEventAsync: mockWebhooksConstructEvent,
      },
      checkout: {
        sessions: {
          create: mockCheckoutSessionsCreate,
          retrieve: mockCheckoutSessionsRetrieve,
        },
      },
      refunds: {
        create: mockRefundsCreate,
      },
    };
  }
  return { default: MockStripe };
});

// Lazy import so env vars can be set per test
const getClient = async () => {
  const { StripeClient } = await import('./stripe.client.js');
  return new StripeClient();
};

describe('StripeClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_mock' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('1. throws when calling method without STRIPE_SECRET_KEY configured', async () => {
    delete process.env['STRIPE_SECRET_KEY'];
    const client = await getClient();
    await expect(client.createPaymentIntent(100, 'USD')).rejects.toThrow(
      'STRIPE_SECRET_KEY not configured'
    );
  });

  it('2. createPaymentIntent calls stripe.paymentIntents.create with correct params', async () => {
    const fakeIntent = { id: 'pi_test', client_secret: 'secret' };
    mockPaymentIntentsCreate.mockResolvedValue(fakeIntent);

    const client = await getClient();
    const result = await client.createPaymentIntent(2999, 'USD', 'cus_test');

    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2999,
        currency: 'usd',
        customer: 'cus_test',
      })
    );
    expect(result).toBe(fakeIntent);
  });

  it('3. createCustomer calls stripe.customers.create with email and name', async () => {
    const fakeCustomer = {
      id: 'cus_123',
      email: 'test@example.com',
      name: 'Test User',
    };
    mockCustomersCreate.mockResolvedValue(fakeCustomer);

    const client = await getClient();
    const result = await client.createCustomer('test@example.com', 'Test User');

    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(result).toBe(fakeCustomer);
  });

  it('4. constructWebhookEvent verifies signature using webhooks.constructEventAsync', async () => {
    const fakeEvent = { type: 'payment_intent.succeeded', id: 'evt_1' };
    mockWebhooksConstructEvent.mockResolvedValue(fakeEvent);

    const client = await getClient();
    const result = await client.constructWebhookEvent(
      'raw-body',
      'sig_header',
      'whsec_test'
    );

    expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
      'raw-body',
      'sig_header',
      'whsec_test'
    );
    expect(result).toBe(fakeEvent);
  });

  it('5. createTransfer calls stripe.transfers.create with correct destination', async () => {
    const fakeTransfer = {
      id: 'tr_123',
      amount: 5000,
      destination: 'acct_test',
    };
    mockTransfersCreate.mockResolvedValue(fakeTransfer);

    const client = await getClient();
    const result = await client.createTransfer(
      5000,
      'acct_test',
      'Payout for instructor'
    );

    expect(mockTransfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, destination: 'acct_test' })
    );
    expect(result).toBe(fakeTransfer);
  });

  it('6. getPaymentIntent calls stripe.paymentIntents.retrieve with id', async () => {
    const fakeIntent = { id: 'pi_retrieve', status: 'succeeded' };
    mockPaymentIntentsRetrieve.mockResolvedValue(fakeIntent);

    const client = await getClient();
    const result = await client.getPaymentIntent('pi_retrieve');

    expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith('pi_retrieve');
    expect(result).toBe(fakeIntent);
  });

  it('7. createCheckoutSession creates checkout session with line items', async () => {
    const fakeSession = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    };
    mockCheckoutSessionsCreate.mockResolvedValue(fakeSession);

    const client = await getClient();
    const result = await client.createCheckoutSession({
      lineItems: [
        { name: 'Test Course', amountCents: 4999, currency: 'usd', quantity: 1 },
      ],
      metadata: { listingId: 'listing-1', tenantId: 'tenant-1' },
      successUrl: 'http://localhost:5173/success',
      cancelUrl: 'http://localhost:5173/cancel',
    });

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'usd',
              unit_amount: 4999,
            }),
          }),
        ]),
      })
    );
    expect(result).toBe(fakeSession);
  });

  it('8. createRefund creates refund for payment intent', async () => {
    const fakeRefund = { id: 're_test_123', status: 'succeeded' };
    mockRefundsCreate.mockResolvedValue(fakeRefund);

    const client = await getClient();
    const result = await client.createRefund('pi_test_123');

    expect(mockRefundsCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_test_123',
    });
    expect(result).toBe(fakeRefund);
  });

  it('9. retrieveCheckoutSession retrieves session by id', async () => {
    const fakeSession = { id: 'cs_test_456', payment_status: 'paid' };
    mockCheckoutSessionsRetrieve.mockResolvedValue(fakeSession);

    const client = await getClient();
    const result = await client.retrieveCheckoutSession('cs_test_456');

    expect(mockCheckoutSessionsRetrieve).toHaveBeenCalledWith('cs_test_456');
    expect(result).toBe(fakeSession);
  });
});
