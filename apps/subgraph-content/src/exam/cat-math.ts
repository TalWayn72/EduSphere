/**
 * CAT Math — Pure functions for Computer Adaptive Testing.
 *
 * Fisher information, standard normal CDF, passing probability.
 * All functions are stateless with zero side effects.
 */
import { D, prob3PL } from '../psychometrics/irt-math.js';

/**
 * Fisher information for a single 3PL item at theta.
 * I_i(θ) = D² × a² × (P-c)² × (1-P) / ((1-c)² × P)
 */
export function fisherInformation3PL(
  theta: number,
  a: number,
  b: number,
  c: number
): number {
  const p = prob3PL(a, b, c, theta);
  const pMinusC = p - c;
  const oneMinusC = 1 - c;
  if (p <= 0 || p >= 1 || oneMinusC === 0) return 0;
  return (
    (D * D * a * a * pMinusC * pMinusC * (1 - p)) / (oneMinusC * oneMinusC * p)
  );
}

/**
 * Standard normal CDF approximation — Abramowitz & Stegun (7.1.26).
 * Max error: 1.5 × 10⁻⁷
 */
export function standardNormalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);

  const coeffs = [
    0.31938153, -0.356563782, 1.781477937, -1.821255978, 1.330274429,
  ];

  const poly =
    t *
    (coeffs[0]! +
      t * (coeffs[1]! + t * (coeffs[2]! + t * (coeffs[3]! + t * coeffs[4]!))));

  const pdf = Math.exp(-0.5 * absZ * absZ) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;

  return sign === 1 ? cdf : 1 - cdf;
}

/**
 * Probability of passing: P(θ > θ_cut) = Φ((θ - θ_cut) / SE)
 */
export function passingProbability(
  theta: number,
  thetaCut: number,
  se: number
): number {
  if (se <= 0) return theta >= thetaCut ? 1 : 0;
  return standardNormalCDF((theta - thetaCut) / se);
}
