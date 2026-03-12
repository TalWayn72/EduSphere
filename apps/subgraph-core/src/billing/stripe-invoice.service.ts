/**
 * StripeInvoiceService — B2B institutional invoicing stub (Phase 53)
 *
 * Full Stripe SDK integration deferred to Phase 54 (requires STRIPE_SECRET_KEY).
 * This service provides the interface and mock implementation for:
 * - Annual contract invoice generation (PDF)
 * - Multi-year contract handling
 * - Webhook event processing stub
 *
 * SECURITY: Never log stripe secret keys. Validate webhook signatures.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';

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

  async onModuleDestroy(): Promise<void> {
    this.logger.log('[StripeInvoiceService] onModuleDestroy: cleanup complete');
  }

  /**
   * Generate an annual B2B invoice stub.
   * Phase 54 will replace this with a real Stripe API call.
   *
   * @param tenantId - The tenant requesting the invoice
   * @param planId   - The subscription plan ID
   * @param year     - Calendar year for the invoice
   */
  async generateAnnualInvoice(
    tenantId: string,
    planId: string,
    year: number
  ): Promise<InvoiceResult> {
    this.logger.log(
      { tenantId, planId, year },
      '[StripeInvoiceService] generateAnnualInvoice (stub)'
    );

    const dueDate = new Date(`${year}-02-01T00:00:00.000Z`);

    return {
      invoiceId: `inv_stub_${randomUUID()}`,
      amount: 0,
      currency: 'USD',
      status: 'draft',
      pdfUrl: null,
      dueDate,
    };
  }

  /**
   * Process a Stripe webhook event.
   * Stub validates that a signature parameter is present but does NOT
   * call the Stripe SDK (deferred to Phase 54).
   *
   * @param payload   - Raw request body string
   * @param signature - Stripe-Signature header value
   */
  async processWebhookEvent(
    payload: string,
    signature: string
  ): Promise<{ handled: boolean; eventType: string }> {
    if (!signature) {
      this.logger.warn(
        '[StripeInvoiceService] Webhook received without Stripe-Signature header'
      );
    }

    // Stub: acknowledge receipt without processing
    this.logger.log(
      { payloadLength: payload.length, signaturePresent: Boolean(signature) },
      '[StripeInvoiceService] processWebhookEvent (stub)'
    );

    return { handled: false, eventType: 'stub' };
  }

  /**
   * Retrieve invoice history for a tenant.
   * Returns empty array in stub — Phase 54 will query Stripe API.
   *
   * @param tenantId - Tenant to fetch invoices for
   * @param limit    - Maximum number of invoices to return (default 10)
   */
  async getInvoiceHistory(
    tenantId: string,
    limit = 10
  ): Promise<InvoiceResult[]> {
    this.logger.log(
      { tenantId, limit },
      '[StripeInvoiceService] getInvoiceHistory (stub)'
    );
    return [];
  }
}
