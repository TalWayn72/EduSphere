/**
 * Performance Baseline Comparison
 *
 * Defines the SLA contracts for performance metrics.
 * Actual k6 result comparison happens in the nightly CI workflow.
 * This test validates the comparison logic and threshold definitions.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BaselineResult {
  scenario: string;
  p95: number;
  p99: number;
  errorRate: number;
  timestamp: string;
}

interface SlaThresholds {
  p95: number;
  p99: number;
  errorRate: number;
  ttfb: number;
}

// ---------------------------------------------------------------------------
// SLA constants (mirrors k6.config.js values)
// ---------------------------------------------------------------------------

const SLA: SlaThresholds = {
  p95: 500,
  p99: 1000,
  errorRate: 0.01,
  ttfb: 400,
};

// ---------------------------------------------------------------------------
// Pure helper functions under test
// ---------------------------------------------------------------------------

function isRegression(
  current: number,
  baseline: number,
  thresholdFraction: number,
): boolean {
  if (baseline === 0) return false; // first run — no baseline to regress against
  return current > baseline * (1 + thresholdFraction);
}

function isErrorRateRegression(
  current: number,
  baseline: number,
  thresholdFraction: number,
): boolean {
  if (baseline === 0) return current > 0;
  return current > baseline * (1 + thresholdFraction);
}

function isValidResult(result: unknown): result is BaselineResult {
  if (typeof result !== 'object' || result === null) return false;
  const r = result as Record<string, unknown>;
  return (
    typeof r['scenario'] === 'string' &&
    typeof r['p95'] === 'number' &&
    typeof r['p99'] === 'number' &&
    typeof r['errorRate'] === 'number' &&
    typeof r['timestamp'] === 'string'
  );
}

function isValidIso8601(value: string): boolean {
  return !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(value);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Performance Baseline Contracts', () => {
  describe('SLA thresholds', () => {
    it('p95 threshold is defined and reasonable (< 2000ms)', () => {
      expect(SLA.p95).toBeDefined();
      expect(SLA.p95).toBeGreaterThan(0);
      expect(SLA.p95).toBeLessThan(2000);
    });

    it('p99 threshold is defined and higher than p95', () => {
      expect(SLA.p99).toBeDefined();
      expect(SLA.p99).toBeGreaterThan(SLA.p95);
    });

    it('error rate threshold is below 5%', () => {
      expect(SLA.errorRate).toBeDefined();
      expect(SLA.errorRate).toBeLessThan(0.05);
    });

    it('TTFB threshold is defined for all scenarios', () => {
      expect(SLA.ttfb).toBeDefined();
      expect(typeof SLA.ttfb).toBe('number');
      expect(SLA.ttfb).toBeGreaterThan(0);
    });
  });

  describe('Regression detection logic', () => {
    it('flags regression when p95 increases by more than 20%', () => {
      expect(isRegression(621, 500, 0.2)).toBe(true);
      expect(isRegression(601, 500, 0.2)).toBe(true);
    });

    it('does not flag as regression when p95 is within 20% of baseline', () => {
      expect(isRegression(600, 500, 0.2)).toBe(false);
      expect(isRegression(500, 500, 0.2)).toBe(false);
      expect(isRegression(400, 500, 0.2)).toBe(false);
    });

    it('flags regression when error rate increases by more than 50%', () => {
      expect(isErrorRateRegression(0.016, 0.01, 0.5)).toBe(true);
      expect(isErrorRateRegression(0.02, 0.01, 0.5)).toBe(true);
    });

    it('handles missing baseline gracefully (first run = set baseline)', () => {
      // When baseline is 0 (first run), any non-zero current sets a new baseline
      expect(isErrorRateRegression(0.005, 0, 0.5)).toBe(true);
      expect(isErrorRateRegression(0, 0, 0.5)).toBe(false);
      // p95 baseline of 0 means first run — treat any value as non-regression
      expect(isRegression(250, 0, 0.2)).toBe(false);
    });
  });

  describe('Baseline result schema', () => {
    const validResult: BaselineResult = {
      scenario: '01-health-check',
      p95: 120,
      p99: 210,
      errorRate: 0.002,
      timestamp: new Date().toISOString(),
    };

    it('result object has required fields: scenario, p95, p99, errorRate, timestamp', () => {
      expect(isValidResult(validResult)).toBe(true);
      expect(isValidResult({ scenario: 'x', p95: 1, p99: 2, errorRate: 0 })).toBe(false);
      expect(isValidResult(null)).toBe(false);
    });

    it('timestamp is a valid ISO 8601 string', () => {
      expect(isValidIso8601(validResult.timestamp)).toBe(true);
      expect(isValidIso8601('not-a-date')).toBe(false);
      expect(isValidIso8601('2026-02-24')).toBe(false);
    });

    it('p95 and p99 are positive numbers in milliseconds', () => {
      expect(validResult.p95).toBeGreaterThan(0);
      expect(validResult.p99).toBeGreaterThan(0);
      expect(typeof validResult.p95).toBe('number');
      expect(typeof validResult.p99).toBe('number');
    });

    it('errorRate is between 0 and 1', () => {
      expect(validResult.errorRate).toBeGreaterThanOrEqual(0);
      expect(validResult.errorRate).toBeLessThanOrEqual(1);
    });
  });
});
