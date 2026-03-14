/**
 * StripeInvoiceService — B2B institutional invoicing (F-09).
 *
 * Graceful degradation:
 *   STRIPE_SECRET_KEY set → real Stripe SDK calls
 *   Not set → stub data with warning log
 *
 * SECURITY: Never log stripe secret keys. Validate webhook signatures.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createStripeClient,
  mapStripeStatus,
} from './stripe-client.helper.js';
import type { StripeClient } from './stripe-client.helper.js';

export interface InvoiceResult {
  invoiceId: string;
  amount: number;
  currency: 'USD';
  status: 'draft' | 'open' | 'paid' | 'void';
  pdfUrl: string | null;
  dueDate: Date;
}

@Injectable()
export class StripeInvoiceService implements OnModuleDestroy {
  private readonly logger = new Logger(StripeInvoiceService.name);
  private stripe: StripeClient | null;

  constructor() {
    this.stripe = createStripeClient();
  }

  async onModuleDestroy(): Promise<void> {
    this.stripe = null;
    this.logger.log('[StripeInvoiceService] onModuleDestroy: cleanup');
  }

  async generateAnnualInvoice(
    tenantId: string,
    planId: string,
    year: number
  ): Promise<InvoiceResult> {
    if (!this.stripe) {
      return this.stubInvoice(tenantId, planId, year);
    }

    try {
      const inv = await this.stripe.invoices.create({
        customer: tenantId,
        description: `Annual — ${planId} — ${String(year)}`,
        collection_method: 'send_invoice',
        days_until_due: 30,
      });
      return {
        invoiceId: inv.id,
        amount: inv.amount_due,
        currency: 'USD',
        status: mapStripeStatus(inv.status),
        pdfUrl: inv.invoice_pdf,
        dueDate: inv.due_date
          ? new Date(inv.due_date * 1000)
          : new Date(`${String(year)}-02-01`),
      };
    } catch (err) {
      this.logger.error({ err, tenantId }, '[StripeInvoiceService] create failed');
      return this.stubInvoice(tenantId, planId, year);
    }
  }

  async processWebhookEvent(
    payload: string,
    signature: string
  ): Promise<{ handled: boolean; eventType: string }> {
    if (!signature) {
      this.logger.warn('[StripeInvoiceService] No Stripe-Signature header');
    }
    if (!this.stripe) {
      this.logger.log('[StripeInvoiceService] processWebhookEvent (stub)');
      return { handled: false, eventType: 'stub' };
    }
    const secret = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      this.logger.log({ eventType: event.type }, '[StripeInvoiceService] Webhook OK');
      return { handled: true, eventType: event.type };
    } catch (err) {
      this.logger.error({ err }, '[StripeInvoiceService] Webhook sig failed');
      return { handled: false, eventType: 'invalid_signature' };
    }
  }

  async getInvoiceHistory(tenantId: string, limit = 10): Promise<InvoiceResult[]> {
    if (!this.stripe) {
      this.logger.log({ tenantId, limit }, '[StripeInvoiceService] history (stub)');
      return [];
    }
    try {
      const res = await this.stripe.invoices.list({ customer: tenantId, limit });
      return res.data.map((inv) => ({
        invoiceId: inv.id,
        amount: inv.amount_due,
        currency: 'USD' as const,
        status: mapStripeStatus(inv.status),
        pdfUrl: inv.invoice_pdf,
        dueDate: inv.due_date ? new Date(inv.due_date * 1000) : new Date(),
      }));
    } catch (err) {
      this.logger.error({ err, tenantId }, '[StripeInvoiceService] list failed');
      return [];
    }
  }

  private stubInvoice(tenantId: string, planId: string, year: number): InvoiceResult {
    this.logger.log({ tenantId, planId, year }, '[StripeInvoiceService] stub invoice');
    return {
      invoiceId: `inv_stub_${randomUUID()}`,
      amount: 0,
      currency: 'USD',
      status: 'draft',
      pdfUrl: null,
      dueDate: new Date(`${String(year)}-02-01T00:00:00.000Z`),
    };
  }
}
