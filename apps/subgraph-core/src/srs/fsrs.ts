/**
 * FSRS-4.5 Spaced Repetition Algorithm — pure TypeScript, zero dependencies.
 * Reference: Jarrett Ye, "A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling"
 * https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 *
 * Quality scale (1-4):
 *   1 — Again (complete failure)
 *   2 — Hard (incorrect but close)
 *   3 — Good (correct with difficulty)
 *   4 — Easy (perfect recall)
 */

export interface FSRSCard {
  /** S — memory stability in days (how long until retrievability = 90%) */
  stability: number;
  /** D — item difficulty on scale 1–10 */
  difficulty: number;
  /** t — elapsed days since last review */
  elapsedDays: number;
  /** scheduled interval in days */
  scheduledDays: number;
  /** total number of reviews */
  reps: number;
  /** number of times the card has lapsed (quality=1 after learning) */
  lapses: number;
}

export interface FSRSResult extends FSRSCard {
  dueDate: Date;
}

/**
 * FSRS-4.5 default weight vector (17 parameters).
 * Source: open-spaced-repetition/fsrs4anki v4.5 optimised defaults.
 */
const DEFAULT_W: readonly number[] = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
];

const RETRIEVABILITY_TARGET = 0.9; // 90% recall target for scheduling
const DECAY = -0.5;
const FACTOR = Math.pow(RETRIEVABILITY_TARGET, 1 / DECAY) - 1; // ≈ 0.1111

/**
 * Compute retrievability (probability of recall) after `elapsedDays` days
 * given memory stability `stability`.
 *
 * Formula: R(t, S) = (1 + t / (9 * S)) ^ -1
 * Equivalent to the power-law forgetting curve from the FSRS spec.
 */
export function retrievability(
  elapsedDays: number,
  stability: number
): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Compute the interval (in days) required to reach the retrievability target
 * given the current stability.
 *
 * Formula: I(S) = S / FACTOR * (R_target^(1/DECAY) - 1)
 */
function nextInterval(stability: number): number {
  const interval = (stability / FACTOR) * (Math.pow(RETRIEVABILITY_TARGET, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

/**
 * Initial stability for a new card based on first-review quality (1-4).
 * Uses w[0..3] from the weight vector.
 */
function initialStability(quality: number): number {
  // quality is 1-4; w index is 0-3
  return Math.max(0.1, DEFAULT_W[quality - 1] ?? DEFAULT_W[0]);
}

/**
 * Initial difficulty for a new card based on first-review quality (1-4).
 * Formula: D0(G) = w[4] - w[5] * (G - 3)
 */
function initialDifficulty(quality: number): number {
  const d = (DEFAULT_W[4] ?? 4.93) - (DEFAULT_W[5] ?? 0.94) * (quality - 3);
  return clampDifficulty(d);
}

/**
 * Constrain difficulty to the valid range [1, 10].
 */
function clampDifficulty(d: number): number {
  return Math.min(10, Math.max(1, d));
}

/**
 * Update difficulty after a review using the mean-reversion formula.
 * Formula: D'(D, G) = w[6] * D0(3) + (1 - w[6]) * (D - w[7] * (G - 3))
 */
function nextDifficulty(currentDifficulty: number, quality: number): number {
  const w6 = DEFAULT_W[6] ?? 0.86;
  const w7 = DEFAULT_W[7] ?? 0.01;
  const d0 = initialDifficulty(3); // mean-reversion anchor at quality=3
  const d = w6 * d0 + (1 - w6) * (currentDifficulty - w7 * (quality - 3));
  return clampDifficulty(d);
}

/**
 * Short-term stability increase after a correct review (recall path).
 * Formula: S'_r(D, S, R, G) = S * e^(w[8]) * (11-D) * S^(-w[9])
 *          * (e^(w[10] * (1-R)) - 1) * w[15] (if G=2) * w[16] (if G=4)
 */
function nextStabilityAfterRecall(
  difficulty: number,
  stability: number,
  retrievabilityVal: number,
  quality: number
): number {
  const w8 = DEFAULT_W[8] ?? 1.49;
  const w9 = DEFAULT_W[9] ?? 0.14;
  const w10 = DEFAULT_W[10] ?? 0.94;
  const w15 = DEFAULT_W[15] ?? 0.29;
  const w16 = DEFAULT_W[16] ?? 2.61;

  let hardPenalty = 1.0;
  let easyBonus = 1.0;
  if (quality === 2) hardPenalty = w15;
  if (quality === 4) easyBonus = w16;

  const s =
    stability *
    Math.exp(w8) *
    (11 - difficulty) *
    Math.pow(stability, -w9) *
    (Math.exp(w10 * (1 - retrievabilityVal)) - 1) *
    hardPenalty *
    easyBonus;

  return Math.max(stability, s);
}

/**
 * Stability after a lapse (forget path, quality=1).
 * Formula: S'_f(D, S, R) = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * e^(w[14]*(1-R))
 */
function nextStabilityAfterLapse(
  difficulty: number,
  stability: number,
  retrievabilityVal: number
): number {
  const w11 = DEFAULT_W[11] ?? 2.18;
  const w12 = DEFAULT_W[12] ?? 0.05;
  const w13 = DEFAULT_W[13] ?? 0.34;
  const w14 = DEFAULT_W[14] ?? 1.26;

  const s =
    w11 *
    Math.pow(difficulty, -w12) *
    (Math.pow(stability + 1, w13) - 1) *
    Math.exp(w14 * (1 - retrievabilityVal));

  return Math.max(0.1, s);
}

/**
 * Compute the next review state for a card given a quality rating.
 * Returns a new object (original is never mutated).
 *
 * @param card  Current card state (use defaults for a brand-new card)
 * @param quality  Review quality: 1=Again, 2=Hard, 3=Good, 4=Easy
 * @returns  New card state including dueDate
 * @throws {RangeError} if quality is not an integer 1-4
 */
export function computeNextReviewFSRS(
  card: FSRSCard,
  quality: number
): FSRSResult {
  if (!Number.isInteger(quality) || quality < 1 || quality > 4) {
    throw new RangeError(
      `FSRS quality must be an integer 1–4, received: ${quality}`
    );
  }

  let { stability, difficulty, reps, lapses, elapsedDays } = card;

  let newStability: number;
  let newDifficulty: number;
  let newLapses = lapses;

  if (reps === 0) {
    // First review — use initial parameters
    newStability = initialStability(quality);
    newDifficulty = initialDifficulty(quality);
  } else if (quality === 1) {
    // Lapse — card forgotten
    newLapses = lapses + 1;
    const r = retrievability(elapsedDays, stability);
    newStability = nextStabilityAfterLapse(difficulty, stability, r);
    newDifficulty = nextDifficulty(difficulty, quality);
  } else {
    // Recall — quality 2, 3, or 4
    const r = retrievability(elapsedDays, stability);
    newStability = nextStabilityAfterRecall(difficulty, stability, r, quality);
    newDifficulty = nextDifficulty(difficulty, quality);
  }

  const newReps = quality === 1 ? reps : reps + 1;
  const scheduledDays = quality === 1 ? 1 : nextInterval(newStability);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + scheduledDays);
  dueDate.setUTCHours(0, 0, 0, 0);

  return {
    stability: newStability,
    difficulty: newDifficulty,
    elapsedDays,
    scheduledDays,
    reps: newReps,
    lapses: newLapses,
    dueDate,
  };
}

/**
 * Create a default FSRSCard representing a brand-new card (never reviewed).
 */
export function newFSRSCard(): FSRSCard {
  return {
    stability: 0,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
  };
}
