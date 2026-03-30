import { describe, it, expect } from 'vitest';
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_PREMIUM_MAX_REQUESTS,
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
  RATE_LIMIT_MAX_STORE_SIZE,
} from './constants';

describe('gateway constants', () => {
  describe('RATE_LIMIT_WINDOW_MS', () => {
    it('equals 60 seconds in milliseconds', () => {
      expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
    });

    it('is a positive number', () => {
      expect(RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
    });
  });

  describe('RATE_LIMIT_MAX_REQUESTS', () => {
    it('equals 100 requests per window for standard tier', () => {
      expect(RATE_LIMIT_MAX_REQUESTS).toBe(100);
    });

    it('is less than premium tier limit', () => {
      expect(RATE_LIMIT_MAX_REQUESTS).toBeLessThan(
        RATE_LIMIT_PREMIUM_MAX_REQUESTS
      );
    });
  });

  describe('RATE_LIMIT_PREMIUM_MAX_REQUESTS', () => {
    it('equals 1000 requests per window for premium tier', () => {
      expect(RATE_LIMIT_PREMIUM_MAX_REQUESTS).toBe(1000);
    });

    it('is 10x the standard tier', () => {
      expect(RATE_LIMIT_PREMIUM_MAX_REQUESTS).toBe(
        RATE_LIMIT_MAX_REQUESTS * 10
      );
    });
  });

  describe('RATE_LIMIT_CLEANUP_INTERVAL_MS', () => {
    it('equals 5 minutes in milliseconds', () => {
      expect(RATE_LIMIT_CLEANUP_INTERVAL_MS).toBe(300_000);
    });

    it('is greater than the rate limit window', () => {
      expect(RATE_LIMIT_CLEANUP_INTERVAL_MS).toBeGreaterThan(
        RATE_LIMIT_WINDOW_MS
      );
    });
  });

  describe('RATE_LIMIT_MAX_STORE_SIZE', () => {
    it('equals 10,000 entries', () => {
      expect(RATE_LIMIT_MAX_STORE_SIZE).toBe(10_000);
    });

    it('is a positive number', () => {
      expect(RATE_LIMIT_MAX_STORE_SIZE).toBeGreaterThan(0);
    });
  });

  describe('constant relationships', () => {
    it('cleanup interval is longer than rate limit window', () => {
      expect(RATE_LIMIT_CLEANUP_INTERVAL_MS).toBeGreaterThan(
        RATE_LIMIT_WINDOW_MS
      );
    });

    it('all constants are finite numbers', () => {
      const constants = [
        RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_PREMIUM_MAX_REQUESTS,
        RATE_LIMIT_CLEANUP_INTERVAL_MS,
        RATE_LIMIT_MAX_STORE_SIZE,
      ];
      for (const c of constants) {
        expect(Number.isFinite(c)).toBe(true);
      }
    });

    it('all constants are integers', () => {
      const constants = [
        RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_PREMIUM_MAX_REQUESTS,
        RATE_LIMIT_CLEANUP_INTERVAL_MS,
        RATE_LIMIT_MAX_STORE_SIZE,
      ];
      for (const c of constants) {
        expect(Number.isInteger(c)).toBe(true);
      }
    });
  });
});
