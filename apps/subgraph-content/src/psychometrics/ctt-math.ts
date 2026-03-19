/**
 * CTT Math — pure statistical functions for Classical Test Theory
 *
 * Extracted from ClassicalAnalysisService for modularity and testability.
 * All functions are stateless and have zero side effects.
 */

export function stddev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / values.length);
}

/**
 * D-index (discrimination): proportion correct in top 27% minus bottom 27%.
 */
export function computeDIndex(
  responses: { userId: string; isCorrect: boolean }[],
  userScores: Map<string, number>,
): number {
  const sorted = [...responses].sort(
    (a, b) =>
      (userScores.get(b.userId) ?? 0) - (userScores.get(a.userId) ?? 0),
  );
  const n27 = Math.max(1, Math.floor(sorted.length * 0.27));
  const upper = sorted.slice(0, n27);
  const lower = sorted.slice(-n27);
  const pUpper = upper.filter((r) => r.isCorrect).length / n27;
  const pLower = lower.filter((r) => r.isCorrect).length / n27;
  return pUpper - pLower;
}

/**
 * Point-biserial correlation (r_pbis) for item-total correlation.
 */
export function computeRpbis(
  responses: { userId: string; isCorrect: boolean }[],
  userScores: Map<string, number>,
  pValue: number,
): number {
  const correctScores: number[] = [];
  const wrongScores: number[] = [];
  const allScores: number[] = [];

  for (const r of responses) {
    const score = userScores.get(r.userId) ?? 0;
    allScores.push(score);
    if (r.isCorrect) correctScores.push(score);
    else wrongScores.push(score);
  }

  if (correctScores.length === 0 || wrongScores.length === 0) return 0;

  const m1 = correctScores.reduce((s, v) => s + v, 0) / correctScores.length;
  const m0 = wrongScores.reduce((s, v) => s + v, 0) / wrongScores.length;
  const meanAll = allScores.reduce((s, v) => s + v, 0) / allScores.length;
  const sd = stddev(allScores, meanAll);

  if (sd === 0) return 0;
  return ((m1 - m0) / sd) * Math.sqrt(pValue * (1 - pValue));
}

/**
 * Point-biserial for a specific distractor option.
 */
export function computeOptionRpbis(
  optResponses: { userId: string }[],
  allResponses: { userId: string }[],
  userScores: Map<string, number>,
): number {
  const chose = new Set(optResponses.map((r) => r.userId));
  const choseScores: number[] = [];
  const notScores: number[] = [];
  const allScores: number[] = [];

  for (const r of allResponses) {
    const score = userScores.get(r.userId) ?? 0;
    allScores.push(score);
    if (chose.has(r.userId)) choseScores.push(score);
    else notScores.push(score);
  }

  if (choseScores.length === 0 || notScores.length === 0) return 0;
  const p = choseScores.length / allScores.length;
  const m1 = choseScores.reduce((s, v) => s + v, 0) / choseScores.length;
  const m0 = notScores.reduce((s, v) => s + v, 0) / notScores.length;
  const mean = allScores.reduce((s, v) => s + v, 0) / allScores.length;
  const sd = stddev(allScores, mean);
  if (sd === 0) return 0;
  return ((m1 - m0) / sd) * Math.sqrt(p * (1 - p));
}
