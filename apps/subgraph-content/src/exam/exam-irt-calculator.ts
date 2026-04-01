/**
 * ExamIrtCalculator — IRT theta estimation via MLE + Newton-Raphson.
 * 3PL model: P(X=1|θ) = c + (1-c) / (1 + exp(-1.702 * a * (θ - b)))
 */
import type { ExamItem } from '@edusphere/db';

interface GradedResponse {
  itemId: string;
  correct: boolean;
}

interface IrtResult {
  theta: number;
  sem: number;
}

interface ConfidenceInterval {
  lower: number;
  upper: number;
}

const D = 1.702; // Normal ogive scaling constant
const MAX_ITER = 50;
const CONVERGENCE = 0.001;

export class ExamIrtCalculator {
  /** 3PL probability of correct response given theta. */
  static probability(theta: number, a: number, b: number, c: number): number {
    const exponent = -D * a * (theta - b);
    return c + (1 - c) / (1 + Math.exp(exponent));
  }

  /**
   * MLE theta estimate using Newton-Raphson iteration.
   * Returns null if items lack calibrated IRT parameters.
   */
  static calculateTheta(
    responses: GradedResponse[],
    itemMap: Map<string, ExamItem>
  ): IrtResult | null {
    const calibrated = responses.filter((r) => {
      const item = itemMap.get(r.itemId);
      return item && item.calibrationStatus === 'CALIBRATED';
    });

    if (calibrated.length < 3) return null;

    let theta = 0; // Initial estimate

    for (let iter = 0; iter < MAX_ITER; iter++) {
      let firstDerivative = 0;
      let secondDerivative = 0;

      for (const resp of calibrated) {
        const item = itemMap.get(resp.itemId)!;
        const a = item.irtA;
        const b = item.irtB;
        const c = item.irtC;
        const x = resp.correct ? 1 : 0;

        const p = this.probability(theta, a, b, c);
        const q = 1 - p;
        const pStar = (p - c) / (1 - c); // P* for 3PL

        // L'(θ) = Σ D * a * (P* / P) * (x - P)
        firstDerivative += D * a * (pStar / p) * (x - p);
        // L''(θ) = -Σ (D * a)² * (P*)² * Q / (P * (1-c)²)
        secondDerivative -=
          ((D * a) ** 2 * pStar ** 2 * q) / (p * (1 - c) ** 2);
      }

      if (Math.abs(secondDerivative) < 1e-10) break;

      const delta = firstDerivative / secondDerivative;
      theta -= delta;

      // Clamp theta to reasonable range
      theta = Math.max(-4, Math.min(4, theta));

      if (Math.abs(delta) < CONVERGENCE) break;
    }

    // SEM = 1 / sqrt(I(θ)) where I = Σ a² * (P-c)² * Q / ((1-c)² * P)
    let totalInfo = 0;
    for (const resp of calibrated) {
      const item = itemMap.get(resp.itemId)!;
      const p = this.probability(theta, item.irtA, item.irtB, item.irtC);
      const q = 1 - p;
      const pMinusC = p - item.irtC;
      const denominator = (1 - item.irtC) ** 2 * p;
      if (denominator > 1e-10) {
        totalInfo += (item.irtA ** 2 * pMinusC ** 2 * q) / denominator;
      }
    }

    const sem = totalInfo > 1e-10 ? 1 / Math.sqrt(totalInfo) : 1;

    return {
      theta: Math.round(theta * 1000) / 1000,
      sem: Math.round(sem * 1000) / 1000,
    };
  }

  /** Map SEM to 0-1000 scale and compute 95% CI. */
  static confidenceInterval(
    scaledScore: number,
    sem: number
  ): ConfidenceInterval {
    // SEM is on theta scale (-4 to 4), map to 0-1000 via the same linear transform
    const scaledSem = sem * 100; // approximate scaling
    return {
      lower: Math.max(200, Math.round(scaledScore - 1.96 * scaledSem)),
      upper: Math.min(1000, Math.round(scaledScore + 1.96 * scaledSem)),
    };
  }
}
