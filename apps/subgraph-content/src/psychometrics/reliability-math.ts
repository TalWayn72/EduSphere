/**
 * Reliability Math — pure functions for test reliability computation
 *
 * KR-20, Cronbach's Alpha, SEM, and variance utilities.
 */

/** Population variance of an array of numbers. */
export function variance(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

/**
 * KR-20 from a binary response matrix (N examinees x K items).
 */
export function computeKR20FromMatrix(matrix: number[][]): number {
  if (matrix.length === 0) return 0;
  const k = matrix[0]!.length;
  if (k <= 1) return 0;

  const totalScores = matrix.map((row) =>
    row.reduce((s, v) => s + v, 0),
  );
  const sigmaTotal = variance(totalScores);
  if (sigmaTotal === 0) return 0;

  let sumPQ = 0;
  for (let j = 0; j < k; j++) {
    const p = matrix.reduce((s, row) => s + row[j]!, 0) / matrix.length;
    sumPQ += p * (1 - p);
  }
  return (k / (k - 1)) * (1 - sumPQ / sigmaTotal);
}

/**
 * Cronbach's Alpha from a response matrix (generalized for polytomous).
 */
export function computeAlphaFromMatrix(matrix: number[][]): number {
  if (matrix.length === 0) return 0;
  const k = matrix[0]!.length;
  if (k <= 1) return 0;

  const totalScores = matrix.map((row) =>
    row.reduce((s, v) => s + v, 0),
  );
  const sigmaTotal = variance(totalScores);
  if (sigmaTotal === 0) return 0;

  let sumItemVar = 0;
  for (let j = 0; j < k; j++) {
    const col = matrix.map((row) => row[j]!);
    sumItemVar += variance(col);
  }
  return (k / (k - 1)) * (1 - sumItemVar / sigmaTotal);
}

/** Standard Error of Measurement. */
export function computeSEM(reliability: number, sdTotal: number): number {
  return sdTotal * Math.sqrt(1 - reliability);
}
