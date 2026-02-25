/**
 * at-risk.types.ts — Shared TypeScript types for F-003 At-Risk Detection.
 */

export interface RiskFactorItem {
  key: string;
  description: string;
}

export interface AtRiskLearner {
  id: string;
  learnerId: string;
  courseId: string;
  riskScore: number;
  riskFactors: RiskFactorItem[];
  flaggedAt: string;
  daysSinceLastActivity: number;
  progressPercent: number;
}
