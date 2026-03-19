import { describe, it, expect } from 'vitest';
import { estimateAbilityEAP } from './cat-eap-estimator';

describe('estimateAbilityEAP', () => {
  it('returns theta near 0 for balanced responses on medium-difficulty items', () => {
    const responses = [
      { isCorrect: true, a: 1, b: 0, c: 0 },
      { isCorrect: false, a: 1, b: 0, c: 0 },
      { isCorrect: true, a: 1, b: 0, c: 0 },
      { isCorrect: false, a: 1, b: 0, c: 0 },
    ];
    const result = estimateAbilityEAP(responses);
    expect(result.theta).toBeCloseTo(0, 0);
  });

  it('returns positive theta for mostly correct responses', () => {
    const responses = Array.from({ length: 8 }, (_, i) => ({
      isCorrect: i < 7,
      a: 1,
      b: 0,
      c: 0.1,
    }));
    const result = estimateAbilityEAP(responses);
    expect(result.theta).toBeGreaterThan(0);
  });

  it('returns negative theta for mostly incorrect responses', () => {
    const responses = Array.from({ length: 8 }, (_, i) => ({
      isCorrect: i >= 7,
      a: 1,
      b: 0,
      c: 0.1,
    }));
    const result = estimateAbilityEAP(responses);
    expect(result.theta).toBeLessThan(0);
  });

  it('SE decreases with more items', () => {
    const mkResponses = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        isCorrect: i % 2 === 0,
        a: 1.2,
        b: 0,
        c: 0.15,
      }));
    const small = estimateAbilityEAP(mkResponses(3));
    const large = estimateAbilityEAP(mkResponses(15));
    expect(large.se).toBeLessThan(small.se);
  });

  it('returns finite values for all-correct edge case', () => {
    const responses = Array.from({ length: 5 }, () => ({
      isCorrect: true,
      a: 1,
      b: 0,
      c: 0,
    }));
    const result = estimateAbilityEAP(responses);
    expect(Number.isFinite(result.theta)).toBe(true);
    expect(Number.isFinite(result.se)).toBe(true);
    expect(result.theta).toBeGreaterThan(0);
  });

  it('returns finite values for all-incorrect edge case', () => {
    const responses = Array.from({ length: 5 }, () => ({
      isCorrect: false,
      a: 1,
      b: 0,
      c: 0,
    }));
    const result = estimateAbilityEAP(responses);
    expect(Number.isFinite(result.theta)).toBe(true);
    expect(Number.isFinite(result.se)).toBe(true);
    expect(result.theta).toBeLessThan(0);
  });

  it('respects custom quadrature point count', () => {
    const responses = [
      { isCorrect: true, a: 1, b: 0, c: 0 },
      { isCorrect: false, a: 1, b: 0, c: 0 },
    ];
    const r21 = estimateAbilityEAP(responses, 21);
    const r81 = estimateAbilityEAP(responses, 81);
    // Both should produce similar results with sufficient points
    expect(r21.theta).toBeCloseTo(r81.theta, 1);
  });
});
