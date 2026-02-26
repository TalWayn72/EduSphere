/**
 * Unit tests for SM-2 spaced repetition algorithm.
 * Tests cover all edge cases of the SM-2 specification.
 */
import { describe, it, expect } from 'vitest';
import { computeNextReview } from './sm2';
import type { SM2Card } from './sm2';

const INITIAL_CARD: SM2Card = {
  intervalDays: 1,
  easeFactor: 2.5,
  repetitions: 0,
};

describe('computeNextReview', () => {
  describe('input validation', () => {
    it('throws RangeError for quality below 0', () => {
      expect(() => computeNextReview(INITIAL_CARD, -1)).toThrow(RangeError);
    });

    it('throws RangeError for quality above 5', () => {
      expect(() => computeNextReview(INITIAL_CARD, 6)).toThrow(RangeError);
    });

    it('throws RangeError for non-integer quality', () => {
      expect(() => computeNextReview(INITIAL_CARD, 2.5)).toThrow(RangeError);
    });

    it('accepts 0 and 5 as boundary values', () => {
      expect(() => computeNextReview(INITIAL_CARD, 0)).not.toThrow();
      expect(() => computeNextReview(INITIAL_CARD, 5)).not.toThrow();
    });
  });

  describe('first review (repetitions === 0)', () => {
    it('quality 5 — perfect recall: sets interval to 1 day, increments repetitions to 1', () => {
      const result = computeNextReview(INITIAL_CARD, 5);
      expect(result.intervalDays).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('quality 3 — minimum correct: sets interval to 1 day, increments repetitions', () => {
      const result = computeNextReview(INITIAL_CARD, 3);
      expect(result.intervalDays).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('quality 0 — blackout: resets repetitions to 0, interval stays 1', () => {
      const result = computeNextReview(INITIAL_CARD, 0);
      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
    });

    it('quality 2 — incorrect: resets to interval=1', () => {
      const card: SM2Card = {
        intervalDays: 10,
        easeFactor: 2.5,
        repetitions: 5,
      };
      const result = computeNextReview(card, 2);
      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
    });
  });

  describe('second review (repetitions === 1)', () => {
    it('quality 4 — correct: sets interval to 6 days', () => {
      const card: SM2Card = {
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 1,
      };
      const result = computeNextReview(card, 4);
      expect(result.intervalDays).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it('quality 5 — correct: sets interval to 6 days', () => {
      const card: SM2Card = {
        intervalDays: 1,
        easeFactor: 2.5,
        repetitions: 1,
      };
      const result = computeNextReview(card, 5);
      expect(result.intervalDays).toBe(6);
    });
  });

  describe('third+ review (repetitions >= 2)', () => {
    it('uses ease_factor multiplication for interval', () => {
      const card: SM2Card = {
        intervalDays: 6,
        easeFactor: 2.5,
        repetitions: 2,
      };
      const result = computeNextReview(card, 4);
      // interval = round(6 * 2.5) = 15
      expect(result.intervalDays).toBe(15);
      expect(result.repetitions).toBe(3);
    });

    it('compounds interval across multiple correct reviews', () => {
      let card: SM2Card = { intervalDays: 6, easeFactor: 2.5, repetitions: 2 };
      card = computeNextReview(card, 5); // interval = 15
      card = computeNextReview(card, 5); // interval = round(15 * ef)
      expect(card.intervalDays).toBeGreaterThan(15);
    });
  });

  describe('ease_factor adjustment', () => {
    it('quality 5 increases ease_factor', () => {
      const result = computeNextReview(INITIAL_CARD, 5);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it('quality 3 decreases ease_factor', () => {
      const result = computeNextReview(INITIAL_CARD, 3);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('ease_factor never drops below 1.3 (minimum)', () => {
      // Multiple failures should floor at 1.3
      let card: SM2Card = { intervalDays: 1, easeFactor: 1.35, repetitions: 3 };
      card = computeNextReview(card, 0);
      expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
      card = computeNextReview(card, 0);
      expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('ease_factor formula: ef + 0.1 - (5-q)*(0.08+(5-q)*0.02) for quality 4', () => {
      const ef = 2.5;
      const q = 4;
      const expected = ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
      const result = computeNextReview(
        { intervalDays: 1, easeFactor: ef, repetitions: 1 },
        q
      );
      // Use second review (repetitions=1) to avoid repetitions=0 branching
      expect(result.easeFactor).toBeCloseTo(expected, 5);
    });
  });

  describe('due_date', () => {
    it('returns a Date in the future', () => {
      const before = Date.now();
      const result = computeNextReview(INITIAL_CARD, 5);
      expect(result.dueDate.getTime()).toBeGreaterThan(before);
    });

    it('interval of 1 sets due_date to approximately tomorrow', () => {
      const result = computeNextReview(INITIAL_CARD, 5);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const diffMs = Math.abs(
        result.dueDate.getTime() - tomorrow.setUTCHours(0, 0, 0, 0)
      );
      expect(diffMs).toBeLessThan(1000); // within 1 second
    });

    it('does not mutate the original card', () => {
      const card: SM2Card = {
        intervalDays: 6,
        easeFactor: 2.5,
        repetitions: 2,
      };
      computeNextReview(card, 5);
      expect(card.intervalDays).toBe(6);
      expect(card.easeFactor).toBe(2.5);
      expect(card.repetitions).toBe(2);
    });
  });
});
