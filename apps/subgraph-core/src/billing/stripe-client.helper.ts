/**
 * stripe-client.helper.ts — Stripe SDK initialization + typed client interface.
 *
 * Extracted from stripe-invoice.service.ts to keep files under 150 lines.
 * SECURITY: Never log stripe secret keys.
 */
import { Logger } from '@nestjs/common';

export interface StripeInvoice {
  id: string;
  amount_due: number;
  status: string;
  invoice_pdf: string | null;
  due_date: number | null;
}

export interface StripeClient {
  invoices: {
    create: (params: Record<string, unknown>) => Promise<StripeInvoice>;
    list: (params: Record<string, unknown>) => Promise<{
      data: StripeInvoice[];
    }>;
  };
  webhooks: {
    constructEvent: (
      payload: string,
      signature: string,
      secret: string
    ) => { type: string };
  };
}

const logger = new Logger('StripeClientHelper');

/**
 * Attempt to initialize the Stripe SDK. Returns null if key is missing
 * or the SDK is not installed.
 */
export function createStripeClient(): StripeClient | null {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) {
    logger.warn(
      '[StripeClientHelper] STRIPE_SECRET_KEY not set — stub mode'
    );
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe') as new (k: string) => StripeClient;
    const client = new Stripe(key);
    logger.log('[StripeClientHelper] Stripe SDK initialized');
    return client;
  } catch (err) {
    logger.error(
      { err },
      '[StripeClientHelper] Failed to init Stripe SDK'
    );
    return null;
  }
}

export function mapStripeStatus(
  status: string | null
): 'draft' | 'open' | 'paid' | 'void' {
  switch (status) {
    case 'draft': return 'draft';
    case 'open': return 'open';
    case 'paid': return 'paid';
    case 'void': return 'void';
    default: return 'draft';
  }
}
