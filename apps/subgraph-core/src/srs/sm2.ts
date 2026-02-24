/**
 * SM-2 Spaced Repetition Algorithm — pure TypeScript, zero dependencies.
 * Reference: Piotr Wozniak, "Optimization of Learning" (1990)
 *
 * Quality scale (0-5):
 *   0 — complete blackout
 *   1 — incorrect response; remembered upon seeing correct answer
 *   2 — incorrect response; correct felt easy on recall
 *   3 — correct with serious difficulty
 *   4 — correct after hesitation
 *   5 — perfect response
 */

export interface SM2Card {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export interface SM2Result extends SM2Card {
  dueDate: Date;
}

const MIN_EASE_FACTOR = 1.3;

/**
 * Compute the next review state for a card given a quality rating.
 * Returns a new object (original is never mutated).
 *
 * @throws {RangeError} if quality is not an integer 0-5.
 */
export function computeNextReview(card: SM2Card, quality: number): SM2Result {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`quality must be an integer 0–5, received: ${quality}`);
  }

  let { intervalDays, easeFactor, repetitions } = card;

  if (quality >= 3) {
    // Correct response — advance schedule
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
    easeFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Incorrect response — reset schedule
    repetitions = 0;
    intervalDays = 1;
  }

  // Enforce minimum ease factor
  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);
  // Normalise to start-of-day UTC for stable scheduling
  dueDate.setUTCHours(0, 0, 0, 0);

  return { intervalDays, easeFactor, repetitions, dueDate };
}
