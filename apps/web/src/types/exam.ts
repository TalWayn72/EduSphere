/**
 * Frontend exam types — mirrors the GraphQL Certification Exam schema.
 * Used for type-safe exam component props and service layer calls.
 */

// ── Enums ────────────────────────────────────────────────────────────────────
export type BloomLevel =
  | 'REMEMBER'
  | 'UNDERSTAND'
  | 'APPLY'
  | 'ANALYZE'
  | 'EVALUATE'
  | 'CREATE';

export type CalibrationStatus = 'DRAFT' | 'PILOT' | 'CALIBRATED' | 'RETIRED';
export type ExamItemSource = 'MANUAL' | 'AI_GENERATED' | 'IMPORTED';
export type QualityTier = 'AI_GENERATED' | 'SME_REVIEWED' | 'PILOT_TESTED' | 'CALIBRATED';
export type PassingMethod = 'PERCENTAGE' | 'SCALED_SCORE' | 'IRT_THETA';
export type BlueprintStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ExamSessionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED'
  | 'TIMED_OUT'
  | 'VOIDED';

// ── Sub-types ────────────────────────────────────────────────────────────────
export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

export interface DistractorStat {
  optionIndex: number;
  selectionRate: number;
  rpbis: number;
  functional: boolean;
}
