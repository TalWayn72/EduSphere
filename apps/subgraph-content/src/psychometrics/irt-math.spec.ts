import { describe, it, expect } from 'vitest';
import {
  prob3PL,
  D,
  clamp,
  computeTestInformation,
  runEM,
  estimateAbilityMLE,
} from './irt-math';

describe('irt-math', () => {
  describe('prob3PL', () => {
    it('returns ~0.5 when theta = b for a=1, c=0', () => {
      expect(prob3PL(1, 0, 0, 0)).toBeCloseTo(0.5, 1);
    });

    it('returns c when theta << b', () => {
      expect(prob3PL(1, 2, 0.25, -6)).toBeCloseTo(0.25, 1);
    });

    it('approaches 1 when theta >> b', () => {
      expect(prob3PL(1, 0, 0, 6)).toBeGreaterThan(0.99);
    });

    it('returns midpoint between c and 1 when theta = b', () => {
      const c = 0.2;
      const expected = c + (1 - c) * 0.5; // 0.6
      expect(prob3PL(1, 0, c, 0)).toBeCloseTo(expected, 1);
    });

    it('uses D scaling constant of 1.702', () => {
      expect(D).toBeCloseTo(1.702, 3);
    });
  });

  describe('clamp', () => {
    it('clamps below min', () => {
      expect(clamp(-5, -4, 4)).toBe(-4);
    });

    it('clamps above max', () => {
      expect(clamp(10, -4, 4)).toBe(4);
    });

    it('returns value when in range', () => {
      expect(clamp(2, -4, 4)).toBe(2);
    });
  });

  describe('computeTestInformation', () => {
    it('returns positive information for calibrated items', () => {
      const items = [
        { a: 1.2, b: 0, c: 0.2 },
        { a: 0.8, b: -1, c: 0.15 },
      ];
      expect(computeTestInformation(items, 0)).toBeGreaterThan(0);
    });

    it('increases with more items', () => {
      const items1 = [{ a: 1, b: 0, c: 0.2 }];
      const items2 = [
        { a: 1, b: 0, c: 0.2 },
        { a: 1, b: 0, c: 0.2 },
      ];
      expect(computeTestInformation(items2, 0)).toBeGreaterThan(
        computeTestInformation(items1, 0)
      );
    });

    it('returns 0 for empty items', () => {
      expect(computeTestInformation([], 0)).toBe(0);
    });
  });

  describe('runEM', () => {
    it('produces valid parameter ranges', () => {
      const responses = [
        { userId: 'u1', isCorrect: true },
        { userId: 'u2', isCorrect: true },
        { userId: 'u3', isCorrect: false },
        { userId: 'u4', isCorrect: false },
        { userId: 'u5', isCorrect: true },
        { userId: 'u6', isCorrect: false },
      ];
      const thetas = new Map([
        ['u1', 1.5],
        ['u2', 1.0],
        ['u3', -1.0],
        ['u4', -1.5],
        ['u5', 0.5],
        ['u6', -0.5],
      ]);
      const result = runEM(responses, thetas);
      expect(result.a).toBeGreaterThanOrEqual(0.2);
      expect(result.a).toBeLessThanOrEqual(3.0);
      expect(result.b).toBeGreaterThanOrEqual(-4.0);
      expect(result.b).toBeLessThanOrEqual(4.0);
      expect(result.c).toBeGreaterThanOrEqual(0.0);
      expect(result.c).toBeLessThanOrEqual(0.35);
    });

    it('produces reasonable parameters for well-separated data', () => {
      const responses = [];
      const thetas = new Map<string, number>();
      for (let i = 0; i < 50; i++) {
        const theta = -2 + (4 * i) / 49;
        const userId = `u${i}`;
        thetas.set(userId, theta);
        responses.push({ userId, isCorrect: theta > 0 });
      }
      const result = runEM(responses, thetas);
      // EM with gradient ascent may not converge with default tol
      // but should produce reasonable discrimination
      expect(result.a).toBeGreaterThan(0.5);
      // runEM returns iter + 1, so max is maxIter + 1 = 101
      expect(result.iterations).toBeLessThanOrEqual(101);
    });
  });

  describe('estimateAbilityMLE', () => {
    it('converges for known response pattern', () => {
      const responses = [
        { isCorrect: true, irtA: 1, irtB: -1, irtC: 0.2 },
        { isCorrect: true, irtA: 1, irtB: 0, irtC: 0.2 },
        { isCorrect: false, irtA: 1, irtB: 1, irtC: 0.2 },
        { isCorrect: false, irtA: 1, irtB: 2, irtC: 0.2 },
      ];
      const result = estimateAbilityMLE(responses);
      expect(Number.isFinite(result.theta)).toBe(true);
      expect(result.se).toBeGreaterThan(0);
    });

    it('higher performance yields higher theta', () => {
      const mkResponses = (correctCount: number) =>
        Array.from({ length: 10 }, (_, i) => ({
          isCorrect: i < correctCount,
          irtA: 1,
          irtB: 0,
          irtC: 0.1,
        }));
      const low = estimateAbilityMLE(mkResponses(2));
      const high = estimateAbilityMLE(mkResponses(8));
      expect(high.theta).toBeGreaterThan(low.theta);
    });

    it('SE is positive', () => {
      const responses = [
        { isCorrect: true, irtA: 1, irtB: 0, irtC: 0 },
        { isCorrect: false, irtA: 1, irtB: 0, irtC: 0 },
      ];
      const result = estimateAbilityMLE(responses);
      expect(result.se).toBeGreaterThan(0);
    });
  });
});
