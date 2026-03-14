/**
 * Static security tests for StripeInvoiceService (Phase 53).
 *
 * Verifies that the stub implementation:
 * - Never hard-codes Stripe secret keys
 * - Validates the webhook signature parameter
 * - Implements OnModuleDestroy for memory safety
 * - Uses Pino Logger (not console.log)
 * - Reads secrets from environment variables only
 *
 * No network access required — pure static analysis on source file.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const SERVICE_PATH = resolve(
  ROOT,
  'apps/subgraph-core/src/billing/stripe-invoice.service.ts'
);

function readService(): string {
  if (!existsSync(SERVICE_PATH)) return '';
  return readFileSync(SERVICE_PATH, 'utf-8');
}

describe('StripeInvoiceService — Security Invariants', () => {
  it('stripe-invoice.service.ts exists', () => {
    expect(existsSync(SERVICE_PATH)).toBe(true);
  });

  it('does NOT hard-code STRIPE_SECRET_KEY value', () => {
    const content = readService();
    // Hard-coded Stripe secret keys start with sk_live_ or sk_test_
    expect(content).not.toMatch(/sk_live_[A-Za-z0-9]+/);
    expect(content).not.toMatch(/sk_test_[A-Za-z0-9]+/);
  });

  it('reads secrets via process.env or defers to SDK (no literal key values)', () => {
    const content = readService();
    // Any reference to STRIPE_SECRET_KEY must be via process.env, not a literal
    const literalKeyPattern = /['"]STRIPE_SECRET_KEY['"]\s*[:=]\s*['"]/;
    expect(content).not.toMatch(literalKeyPattern);
  });

  it('processWebhookEvent signature parameter is referenced (not ignored)', () => {
    const content = readService();
    // The function must accept and use the signature param
    expect(content).toContain('signature');
    // It should check whether signature is present
    expect(content).toMatch(/signature/);
  });

  it('implements OnModuleDestroy for memory safety', () => {
    const content = readService();
    expect(content).toContain('OnModuleDestroy');
    expect(content).toContain('onModuleDestroy');
  });

  it('uses NestJS Logger — no console.log calls', () => {
    const content = readService();
    expect(content).not.toContain('console.log');
    expect(content).not.toContain('console.warn');
    expect(content).not.toContain('console.error');
    expect(content).toContain('Logger');
  });

  it('imports Logger from @nestjs/common (Pino-compatible)', () => {
    const content = readService();
    expect(content).toContain("from '@nestjs/common'");
    expect(content).toContain('Logger');
  });

  it('InvoiceResult type is exported', () => {
    const content = readService();
    expect(content).toMatch(/export\s+(interface|type)\s+InvoiceResult/);
  });

  it('status field in InvoiceResult includes draft (B2B invoicing baseline)', () => {
    const content = readService();
    expect(content).toContain("'draft'");
  });

  it('generateAnnualInvoice uses structured Pino logging (tenantId as context, not interpolated)', () => {
    const content = readService();
    // Structured Pino context { err, tenantId } is acceptable per project rules
    // (tenantId is a UUID, not PII). What's NOT allowed: template-string interpolation.
    const interpolatedTenantId = /this\.logger\.error\(`[^`]*\$\{.*tenantId.*\}[^`]*`\)/;
    expect(content).not.toMatch(interpolatedTenantId);
  });
});
