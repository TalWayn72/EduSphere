/**
 * EAP Ability Estimator — Expected A Posteriori with Gaussian quadrature.
 *
 * Used for early CAT items (< 5 responses) where MLE is unstable.
 * Prior: N(0, 1). Quadrature: 41 points from -4 to +4.
 */
import { prob3PL } from '../psychometrics/irt-math.js';

interface EAPResponse {
  isCorrect: boolean;
  a: number;
  b: number;
  c: number;
}

interface EAPResult {
  theta: number;
  se: number;
}

/**
 * Gaussian quadrature EAP estimation.
 *
 * θ_EAP = Σ θ_k × posterior(θ_k) × Δθ / Σ posterior(θ_k) × Δθ
 * SE_EAP = sqrt(Σ (θ_k - θ_EAP)² × posterior(θ_k) × Δθ / Σ post × Δθ)
 */
export function estimateAbilityEAP(
  responses: EAPResponse[],
  quadPoints = 41
): EAPResult {
  const lower = -4;
  const upper = 4;
  const step = (upper - lower) / (quadPoints - 1);

  const points: number[] = [];
  for (let k = 0; k < quadPoints; k++) {
    points.push(lower + k * step);
  }

  // Compute log-likelihood + log-prior at each quadrature point
  const logPosterior = points.map((theta) => {
    let logL = 0;
    for (const r of responses) {
      const p = prob3PL(r.a, r.b, r.c, theta);
      const pClamped = Math.max(1e-10, Math.min(1 - 1e-10, p));
      logL += r.isCorrect ? Math.log(pClamped) : Math.log(1 - pClamped);
    }
    // N(0,1) log-prior
    const logPrior = -0.5 * theta * theta;
    return logL + logPrior;
  });

  // Normalize: subtract max for numerical stability
  const maxLog = Math.max(...logPosterior);
  const posterior = logPosterior.map((lp) => Math.exp(lp - maxLog));

  // Numerical integration
  let sumPost = 0;
  let sumThetaPost = 0;

  for (let k = 0; k < quadPoints; k++) {
    const w = (posterior.at(k) ?? 0) * step;
    sumPost += w;
    sumThetaPost += (points.at(k) ?? 0) * w;
  }

  const thetaEAP = sumPost > 0 ? sumThetaPost / sumPost : 0;

  // Compute SE
  let sumVarPost = 0;
  for (let k = 0; k < quadPoints; k++) {
    const diff = (points.at(k) ?? 0) - thetaEAP;
    sumVarPost += diff * diff * (posterior.at(k) ?? 0) * step;
  }

  const variance = sumPost > 0 ? sumVarPost / sumPost : 1;
  const se = Math.sqrt(Math.max(variance, 1e-6));

  return {
    theta: Math.round(thetaEAP * 1000) / 1000,
    se: Math.round(se * 1000) / 1000,
  };
}
