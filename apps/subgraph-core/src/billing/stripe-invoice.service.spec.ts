/**
 * stripe-invoice.service.spec.ts — Unit tests for StripeInvoiceService (Phase 53).
 * Validates stub behaviour: invoice shape, webhook handling, history, cleanup.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { StripeInvoiceService } from './stripe-invoice.service.js';

describe('StripeInvoiceService (stub)', () => {
  let service: StripeInvoiceService;

  beforeEach(() => {
    service = new StripeInvoiceService();
  });

  it('constructs without throwing', () => {
    expect(service).toBeDefined();
  });

  it('generateAnnualInvoice returns a draft invoice with required fields', async () => {
    const result = await service.generateAnnualInvoice('tenant-1', 'plan-1', 2026);

    expect(result.invoiceId).toMatch(/^inv_stub_/);
    expect(result.currency).toBe('USD');
    expect(result.status).toBe('draft');
    expect(typeof result.amount).toBe('number');
    expect(result.dueDate).toBeInstanceOf(Date);
    expect(result.pdfUrl).toBeNull();
  });

  it('generateAnnualInvoice returns unique invoiceIds on successive calls', async () => {
    const a = await service.generateAnnualInvoice('tenant-1', 'plan-1', 2026);
    const b = await service.generateAnnualInvoice('tenant-1', 'plan-1', 2026);
    expect(a.invoiceId).not.toBe(b.invoiceId);
  });

  it('generateAnnualInvoice sets dueDate within the requested year', async () => {
    const result = await service.generateAnnualInvoice('tenant-2', 'plan-2', 2027);
    expect(result.dueDate.getUTCFullYear()).toBe(2027);
  });

  it('processWebhookEvent returns { handled: false } in stub mode', async () => {
    const result = await service.processWebhookEvent(
      JSON.stringify({ type: 'invoice.paid' }),
      'whsec_test_signature'
    );
    expect(result.handled).toBe(false);
    expect(result.eventType).toBe('stub');
  });

  it('processWebhookEvent accepts missing signature without throwing', async () => {
    const result = await service.processWebhookEvent('{}', '');
    expect(result.handled).toBe(false);
  });

  it('getInvoiceHistory returns an array', async () => {
    const result = await service.getInvoiceHistory('tenant-1');
    expect(Array.isArray(result)).toBe(true);
  });

  it('getInvoiceHistory returns empty array in stub', async () => {
    const result = await service.getInvoiceHistory('tenant-1', 5);
    expect(result).toHaveLength(0);
  });

  it('onModuleDestroy resolves without throwing', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
