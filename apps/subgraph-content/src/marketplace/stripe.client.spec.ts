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
});
