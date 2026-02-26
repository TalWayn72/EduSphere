/**
 * Unit tests for FSRS-4.5 spaced repetition algorithm.
 */
import { describe, it, expect } from 'vitest';
import { computeNextReviewFSRS, retrievability, newFSRSCard } from './fsrs';
import type { FSRSCard } from './fsrs';

describe('retrievability', () => {
  it('returns 1.0 when elapsed days is 0', () => {
    expect(retrievability(0, 10)).toBeCloseTo(1.0, 5);
  });

  it('returns ~0.9 when elapsed days equals stability (90% target zone)', () => {
    // At t = S, R ≈ 1/(1 + 1/9) = 0.9
    const s = 10;
    const r = retrievability(s, s);
    expect(r).toBeCloseTo(0.9, 2);
  });

  it('decreases as elapsed days increase', () => {
    const s = 10;
    const r1 = retrievability(5, s);
    const r2 = retrievability(10, s);
    const r3 = retrievability(20, s);
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r3);
  });

  it('returns 0 for zero or negative stability', () => {
    expect(retrievability(5, 0)).toBe(0);
    expect(retrievability(5, -1)).toBe(0);
  });

  it('is bounded in [0, 1]', () => {
    expect(retrievability(0, 1)).toBeLessThanOrEqual(1);
    expect(retrievability(1000, 1)).toBeGreaterThanOrEqual(0);
  });
});

describe('computeNextReviewFSRS — input validation', () => {
  const card = newFSRSCard();

  it('throws RangeError for quality 0', () => {
    expect(() => computeNextReviewFSRS(card, 0)).toThrow(RangeError);
  });

  it('throws RangeError for quality 5', () => {
    expect(() => computeNextReviewFSRS(card, 5)).toThrow(RangeError);
  });

  it('throws RangeError for non-integer quality', () => {
    expect(() => computeNextReviewFSRS(card, 2.5)).toThrow(RangeError);
  });

  it('accepts quality 1, 2, 3, 4 without throwing', () => {
    expect(() => computeNextReviewFSRS(card, 1)).not.toThrow();
    expect(() => computeNextReviewFSRS(card, 2)).not.toThrow();
    expect(() => computeNextReviewFSRS(card, 3)).not.toThrow();
    expect(() => computeNextReviewFSRS(card, 4)).not.toThrow();
  });
});

describe('computeNextReviewFSRS — new card (reps === 0)', () => {
  it('quality=3 (Good) produces interval in reasonable range 1-6 days', () => {
    const card = newFSRSCard();
    const result = computeNextReviewFSRS(card, 3);
    expect(result.scheduledDays).toBeGreaterThanOrEqual(1);
    expect(result.scheduledDays).toBeLessThanOrEqual(6);
    expect(result.reps).toBe(1);
  });

  it('quality=1 (Again) produces interval of 1 day', () => {
    const card = newFSRSCard();
    const result = computeNextReviewFSRS(card, 1);
    expect(result.scheduledDays).toBe(1);
    expect(result.lapses).toBe(card.lapses); // no lapse on first review
  });

  it('quality=4 (Easy) produces longer interval than quality=3 (Good)', () => {
    const card = newFSRSCard();
    const goodResult = computeNextReviewFSRS(card, 3);
    const easyResult = computeNextReviewFSRS(card, 4);
    expect(easyResult.scheduledDays).toBeGreaterThanOrEqual(
      goodResult.scheduledDays
    );
  });

  it('quality=2 (Hard) produces shorter interval than quality=3 (Good)', () => {
    const card = newFSRSCard();
    const hardResult = computeNextReviewFSRS(card, 2);
    const goodResult = computeNextReviewFSRS(card, 3);
    expect(hardResult.scheduledDays).toBeLessThanOrEqual(
      goodResult.scheduledDays
    );
  });

  it('sets reps to 0 on Again (quality=1), not incrementing', () => {
    const card = newFSRSCard();
    const result = computeNextReviewFSRS(card, 1);
    // reps is preserved (not incremented) on lapse
    expect(result.reps).toBe(0);
  });
});

describe('computeNextReviewFSRS — reviewed card', () => {
  const reviewedCard: FSRSCard = {
    stability: 10,
    difficulty: 5,
    elapsedDays: 10,
    scheduledDays: 10,
    reps: 3,
    lapses: 0,
  };

  it('quality=1 (Again) produces 1-day interval and increments lapses', () => {
    const result = computeNextReviewFSRS(reviewedCard, 1);
    expect(result.scheduledDays).toBe(1);
    expect(result.lapses).toBe(reviewedCard.lapses + 1);
    expect(result.reps).toBe(reviewedCard.reps); // reps unchanged on lapse
  });

  it('quality=4 (Easy) produces longer interval than quality=3 (Good)', () => {
    const goodResult = computeNextReviewFSRS(reviewedCard, 3);
    const easyResult = computeNextReviewFSRS(reviewedCard, 4);
    expect(easyResult.scheduledDays).toBeGreaterThanOrEqual(
      goodResult.scheduledDays
    );
    expect(easyResult.stability).toBeGreaterThanOrEqual(goodResult.stability);
  });

  it('increments reps on successful recall (quality >= 2)', () => {
    const result = computeNextReviewFSRS(reviewedCard, 3);
    expect(result.reps).toBe(reviewedCard.reps + 1);
  });

  it('stability after recall is at least as large as before', () => {
    const result = computeNextReviewFSRS(reviewedCard, 3);
    expect(result.stability).toBeGreaterThanOrEqual(reviewedCard.stability);
  });

  it('difficulty stays in range [1, 10]', () => {
    for (const q of [1, 2, 3, 4] as const) {
      const result = computeNextReviewFSRS(reviewedCard, q);
      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(10);
    }
  });
});

describe('computeNextReviewFSRS — dueDate', () => {
  it('returns a dueDate in the future', () => {
    const card = newFSRSCard();
    const before = Date.now();
    const result = computeNextReviewFSRS(card, 3);
    expect(result.dueDate.getTime()).toBeGreaterThan(before);
  });

  it('does not mutate the original card', () => {
    const card: FSRSCard = {
      stability: 10,
      difficulty: 5,
      elapsedDays: 10,
      scheduledDays: 10,
      reps: 2,
      lapses: 0,
    };
    const originalReps = card.reps;
    const originalStability = card.stability;
    computeNextReviewFSRS(card, 3);
    expect(card.reps).toBe(originalReps);
    expect(card.stability).toBe(originalStability);
  });
});
