/**
 * at-risk-thresholds.schemas.ts — Zod validation for F-18 saveAtRiskThresholds.
 */
import { z } from 'zod';

export const AtRiskThresholdsInputSchema = z.object({
  inactivityDays: z.number().int().min(1).max(365),
  minCompletionPct: z.number().min(0).max(100),
  minQuizScorePct: z.number().min(0).max(100),
});

export type AtRiskThresholdsInput = z.infer<typeof AtRiskThresholdsInputSchema>;
