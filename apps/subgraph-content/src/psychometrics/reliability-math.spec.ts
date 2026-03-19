import { describe, it, expect } from 'vitest';
import {
  variance,
  computeKR20FromMatrix,
  computeAlphaFromMatrix,
  computeSEM,
} from './reliability-math';

describe('reliability-math', () => {
  describe('variance', () => {
    it('returns 0 for single element', () => {
      expect(variance([42])).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(variance([])).toBe(0);
    });

    it('computes known variance', () => {
      // [1,2,3,4,5] mean=3, var = (4+1+0+1+4)/5 = 2
      expect(variance([1, 2, 3, 4, 5])).toBeCloseTo(2, 5);
    });

    it('returns 0 for identical values', () => {
      expect(variance([7, 7, 7, 7])).toBe(0);
    });
  });

  describe('computeKR20FromMatrix', () => {
    it('returns known value for simple binary data', () => {
      // 5 examinees, 4 items — mixture of difficulty
      const matrix = [
        [1, 1, 1, 1], // perfect
        [1, 1, 1, 0],
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0], // zero
      ];
      const kr20 = computeKR20FromMatrix(matrix);
      expect(kr20).toBeGreaterThan(0);
      expect(kr20).toBeLessThanOrEqual(1);
    });

    it('returns 0 for empty matrix', () => {
      expect(computeKR20FromMatrix([])).toBe(0);
    });

    it('returns 0 for single-item matrix', () => {
      expect(computeKR20FromMatrix([[1], [0], [1]])).toBe(0);
    });

    it('returns 0 when all scores are identical', () => {
      const matrix = [
        [1, 0, 1],
        [1, 0, 1],
        [1, 0, 1],
      ];
      expect(computeKR20FromMatrix(matrix)).toBe(0);
    });

    it('approaches 1 for highly reliable test', () => {
      // Items perfectly correlate — high scorers get all right, low scorers get all wrong
      const matrix = [
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 0],
        [1, 1, 1, 0, 0],
        [1, 1, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ];
      const kr20 = computeKR20FromMatrix(matrix);
      expect(kr20).toBeGreaterThan(0.7);
    });
  });

  describe('computeAlphaFromMatrix', () => {
    it('equals KR-20 for binary data', () => {
      const matrix = [
        [1, 1, 1, 1],
        [1, 1, 1, 0],
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const kr20 = computeKR20FromMatrix(matrix);
      const alpha = computeAlphaFromMatrix(matrix);
      expect(alpha).toBeCloseTo(kr20, 5);
    });

    it('returns 0 for empty matrix', () => {
      expect(computeAlphaFromMatrix([])).toBe(0);
    });

    it('returns 0 for single-item matrix', () => {
      expect(computeAlphaFromMatrix([[3], [4], [5]])).toBe(0);
    });
  });

  describe('computeSEM', () => {
    it('decreases with higher reliability', () => {
      const sem70 = computeSEM(0.7, 10);
      const sem90 = computeSEM(0.9, 10);
      expect(sem90).toBeLessThan(sem70);
    });

    it('returns 0 when reliability is 1', () => {
      expect(computeSEM(1, 10)).toBeCloseTo(0, 5);
    });

    it('equals SD when reliability is 0', () => {
      expect(computeSEM(0, 15)).toBeCloseTo(15, 5);
    });

    it('scales with standard deviation', () => {
      const sem1 = computeSEM(0.8, 10);
      const sem2 = computeSEM(0.8, 20);
      expect(sem2).toBeCloseTo(sem1 * 2, 5);
    });
  });
});
