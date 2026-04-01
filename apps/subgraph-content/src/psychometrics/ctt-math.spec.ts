import { describe, it, expect } from 'vitest';
import { stddev, computeDIndex, computeRpbis } from './ctt-math';

describe('ctt-math', () => {
  describe('stddev', () => {
    it('returns 0 for single element', () => {
      expect(stddev([5], 5)).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(stddev([], 0)).toBe(0);
    });

    it('computes correct stddev for known data', () => {
      // [2, 4, 4, 4, 5, 5, 7, 9] mean=5, variance=4, sd=2
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      expect(stddev(values, 5)).toBeCloseTo(2, 1);
    });

    it('returns 0 for identical values', () => {
      expect(stddev([3, 3, 3, 3], 3)).toBe(0);
    });
  });

  describe('computeDIndex', () => {
    it('returns positive for discriminating items', () => {
      // High scorers got it right, low scorers got it wrong
      const responses = [
        { userId: 'u1', isCorrect: true },
        { userId: 'u2', isCorrect: true },
        { userId: 'u3', isCorrect: true },
        { userId: 'u4', isCorrect: true },
        { userId: 'u5', isCorrect: false },
        { userId: 'u6', isCorrect: false },
        { userId: 'u7', isCorrect: false },
        { userId: 'u8', isCorrect: false },
      ];
      const scores = new Map([
        ['u1', 90],
        ['u2', 85],
        ['u3', 80],
        ['u4', 75],
        ['u5', 40],
        ['u6', 35],
        ['u7', 30],
        ['u8', 25],
      ]);
      expect(computeDIndex(responses, scores)).toBeGreaterThan(0);
    });

    it('returns 0 when all responses are correct', () => {
      const responses = [
        { userId: 'u1', isCorrect: true },
        { userId: 'u2', isCorrect: true },
        { userId: 'u3', isCorrect: true },
        { userId: 'u4', isCorrect: true },
      ];
      const scores = new Map([
        ['u1', 90],
        ['u2', 70],
        ['u3', 50],
        ['u4', 30],
      ]);
      expect(computeDIndex(responses, scores)).toBe(0);
    });

    it('returns negative for inversely discriminating items', () => {
      // Low scorers got it right, high scorers got it wrong
      const responses = [
        { userId: 'u1', isCorrect: false },
        { userId: 'u2', isCorrect: false },
        { userId: 'u3', isCorrect: true },
        { userId: 'u4', isCorrect: true },
      ];
      const scores = new Map([
        ['u1', 90],
        ['u2', 80],
        ['u3', 30],
        ['u4', 20],
      ]);
      expect(computeDIndex(responses, scores)).toBeLessThan(0);
    });
  });

  describe('computeRpbis', () => {
    it('returns positive for good items', () => {
      const responses = [
        { userId: 'u1', isCorrect: true },
        { userId: 'u2', isCorrect: true },
        { userId: 'u3', isCorrect: false },
        { userId: 'u4', isCorrect: false },
      ];
      const scores = new Map([
        ['u1', 90],
        ['u2', 85],
        ['u3', 40],
        ['u4', 30],
      ]);
      const pValue = 0.5; // 2 of 4 correct
      expect(computeRpbis(responses, scores, pValue)).toBeGreaterThan(0);
    });

    it('returns negative for bad items', () => {
      // Low scorers got it right, high scorers got it wrong
      const responses = [
        { userId: 'u1', isCorrect: false },
        { userId: 'u2', isCorrect: false },
        { userId: 'u3', isCorrect: true },
        { userId: 'u4', isCorrect: true },
      ];
      const scores = new Map([
        ['u1', 90],
        ['u2', 85],
        ['u3', 40],
        ['u4', 30],
      ]);
      expect(computeRpbis(responses, scores, 0.5)).toBeLessThan(0);
    });

    it('returns 0 when all got it correct', () => {
      const responses = [
        { userId: 'u1', isCorrect: true },
        { userId: 'u2', isCorrect: true },
      ];
      const scores = new Map([
        ['u1', 90],
        ['u2', 50],
      ]);
      expect(computeRpbis(responses, scores, 1.0)).toBe(0);
    });

    it('returns 0 when standard deviation is zero', () => {
      const responses = [
        { userId: 'u1', isCorrect: true },
        { userId: 'u2', isCorrect: false },
      ];
      const scores = new Map([
        ['u1', 50],
        ['u2', 50],
      ]);
      expect(computeRpbis(responses, scores, 0.5)).toBe(0);
    });
  });
});
