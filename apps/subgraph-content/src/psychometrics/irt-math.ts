/**
 * IRT Math — pure functions for Item Response Theory (3PL model)
 *
 * Extracted from IRTCalibrationService for modularity and testability.
 * All functions are stateless with zero side effects.
 */
import type { ItemResponse } from './psychometrics.types.js';

export const D = 1.702; // logistic scaling constant

/** 3PL probability: P(X=1|theta) = c + (1-c) / (1 + exp(-D*a*(theta-b))) */
export function prob3PL(
  a: number,
  b: number,
  c: number,
  theta: number,
): number {
  const exp = Math.exp(-D * a * (theta - b));
  return c + (1 - c) / (1 + exp);
}

/** Clamp value to [min, max]. */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Fisher information for a set of items at a given theta. */
export function computeTestInformation(
  items: Array<{ a: number; b: number; c: number }>,
  theta: number,
): number {
  let info = 0;
  for (const item of items) {
    const p = prob3PL(item.a, item.b, item.c, theta);
    const pMinusC = p - item.c;
    const oneMinusC = 1 - item.c;
    if (p <= 0 || p >= 1 || oneMinusC === 0) continue;
    info +=
      D * D * item.a * item.a * pMinusC * pMinusC * (1 - p)
      / (oneMinusC * oneMinusC * p);
  }
  return info;
}

/**
 * EM algorithm for 3PL parameter estimation.
 * Uses gradient ascent in M-step with learning rate.
 */
export function runEM(
  responses: Array<{ userId: string; isCorrect: boolean }>,
  userThetas: Map<string, number>,
  maxIter = 100,
  tol = 0.01,
): { a: number; b: number; c: number; converged: boolean; iterations: number } {
  let a = 1.0;
  let b = 0.0;
  let c = 0.2;
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIter; iter++) {
    let gradA = 0, gradB = 0, gradC = 0;

    for (const r of responses) {
      const theta = userThetas.get(r.userId) ?? 0;
      const p = prob3PL(a, b, c, theta);
      const x = r.isCorrect ? 1 : 0;
      const pMinusC = p - c;
      const oneMinusC = 1 - c;
      if (p <= 0.001 || p >= 0.999 || oneMinusC === 0) continue;

      const residual = (x - p) / (p * (1 - p));
      const dPdA = D * (theta - b) * pMinusC * (1 - p) / oneMinusC;
      const dPdB = -D * a * pMinusC * (1 - p) / oneMinusC;
      const dPdC = (1 - p) / oneMinusC;

      gradA += residual * dPdA;
      gradB += residual * dPdB;
      gradC += residual * dPdC;
    }

    const lr = 0.05;
    const newA = clamp(a + lr * gradA, 0.2, 3.0);
    const newB = clamp(b + lr * gradB, -4.0, 4.0);
    const newC = clamp(c + lr * gradC, 0.0, 0.35);

    if (
      Math.abs(newA - a) < tol &&
      Math.abs(newB - b) < tol &&
      Math.abs(newC - c) < tol
    ) {
      a = newA; b = newB; c = newC;
      converged = true;
      break;
    }
    a = newA; b = newB; c = newC;
  }

  return { a, b, c, converged, iterations: iter + 1 };
}

/**
 * MLE ability estimation via Newton-Raphson.
 */
export function estimateAbilityMLE(
  responses: ItemResponse[],
  maxIter = 50,
  tolerance = 0.001,
): { theta: number; se: number } {
  let theta = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    let lPrime = 0;
    let lDoublePrime = 0;

    for (const r of responses) {
      const p = prob3PL(r.irtA, r.irtB, r.irtC, theta);
      const x = r.isCorrect ? 1 : 0;
      const pMinusC = p - r.irtC;
      const oneMinusC = 1 - r.irtC;
      if (p <= 0 || p >= 1 || oneMinusC === 0) continue;

      lPrime += D * r.irtA * (x - p) * pMinusC / (p * oneMinusC);
      lDoublePrime -=
        D * D * r.irtA * r.irtA * pMinusC * pMinusC * (1 - p)
        / (oneMinusC * oneMinusC * p);
    }

    if (lDoublePrime === 0) break;
    const delta = lPrime / lDoublePrime;
    theta = clamp(theta - delta, -6, 6);
    if (Math.abs(delta) < tolerance) break;
  }

  const info = computeTestInformation(
    responses.map((r) => ({ a: r.irtA, b: r.irtB, c: r.irtC })),
    theta,
  );
  const se = info > 0 ? 1 / Math.sqrt(info) : 9.99;

  return { theta, se };
}
