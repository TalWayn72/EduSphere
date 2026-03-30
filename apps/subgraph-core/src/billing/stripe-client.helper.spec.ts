/**
 * stripe-client.helper.spec.ts — Unit tests for Stripe client initialization
 * and status mapping helper.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStripeClient, mapStripeStatus } from './stripe-client.helper.js';

describe('stripe-client.helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createStripeClient', () => {
    it('returns null when STRIPE_SECRET_KEY is not set', () => {
      delete process.env['STRIPE_SECRET_KEY'];
      const result = createStripeClient();
      expect(result).toBeNull();
    });

    it('returns null when STRIPE_SECRET_KEY is empty string', () => {
      process.env['STRIPE_SECRET_KEY'] = '';
      const result = createStripeClient();
      expect(result).toBeNull();
    });

    it('returns a client when STRIPE_SECRET_KEY is set and SDK available', () => {
      process.env['STRIPE_SECRET_KEY'] = 'sk_test_fake_key';
      const result = createStripeClient();
      // Stripe SDK is installed, so it should return a client object
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });
  });

  describe('mapStripeStatus', () => {
    it('maps "draft" to "draft"', () => {
      expect(mapStripeStatus('draft')).toBe('draft');
    });

    it('maps "open" to "open"', () => {
      expect(mapStripeStatus('open')).toBe('open');
    });

    it('maps "paid" to "paid"', () => {
      expect(mapStripeStatus('paid')).toBe('paid');
    });

    it('maps "void" to "void"', () => {
      expect(mapStripeStatus('void')).toBe('void');
    });

    it('maps unknown status to "draft" as default', () => {
      expect(mapStripeStatus('cancelled')).toBe('draft');
    });

    it('maps null to "draft" as default', () => {
      expect(mapStripeStatus(null)).toBe('draft');
    });

    it('maps empty string to "draft" as default', () => {
      expect(mapStripeStatus('')).toBe('draft');
    });

    it('maps "uncollectible" to "draft" as default', () => {
      expect(mapStripeStatus('uncollectible')).toBe('draft');
    });
  });
});
