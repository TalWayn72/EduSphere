import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

const STRIPE_API_VERSION = '2026-01-28.clover' as const;

@Injectable()
export class StripeClient {
  private readonly logger = new Logger(StripeClient.name);
  private readonly stripe: Stripe | null;

  constructor() {
    const key = process.env['STRIPE_SECRET_KEY'];
    if (!key) {
      this.logger.warn('STRIPE_SECRET_KEY not set — marketplace payments disabled');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
    }
  }

  private get client(): Stripe {
    if (!this.stripe) throw new Error('STRIPE_SECRET_KEY not configured');
    return this.stripe;
  }

  async createPaymentIntent(
    amountCents: number,
    currency: string,
    customerId?: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      ...(customerId ? { customer: customerId } : {}),
      automatic_payment_methods: { enabled: true },
    });
  }

  async createCustomer(
    email: string,
    name: string,
  ): Promise<Stripe.Customer> {
    return this.client.customers.create({ email, name }) as Promise<Stripe.Customer>;
  }

  async createTransfer(
    amountCents: number,
    stripeAccountId: string,
    description: string,
  ): Promise<Stripe.Transfer> {
    return this.client.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: stripeAccountId,
      description,
    });
  }

  async constructWebhookEvent(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<Stripe.Event> {
    return this.client.webhooks.constructEventAsync(payload, signature, secret);
  }

  async getPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.client.paymentIntents.retrieve(id);
  }
}
