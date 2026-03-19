/**
 * Psychometric Analysis — shared type definitions
 *
 * Used across CTT, IRT, reliability, and health-monitor services.
 */

// ── Classical Test Theory ────────────────────────────────────────────────

export interface ClassicalItemStats {
  itemId: string;
  pValue: number;
  dIndex: number;
  rpbis: number;
  totalResponses: number;
}

export interface DistractorStat {
  optionIndex: number;
  selectionRate: number;
  rpbis: number;
  functional: boolean;
}

export interface DistractorReport {
  itemId: string;
  distractors: DistractorStat[];
}

// ── Item Response Theory (3PL) ───────────────────────────────────────────

export interface IRTParameters {
  itemId: string;
  a: number; // discrimination
  b: number; // difficulty
  c: number; // guessing
  converged: boolean;
  iterations: number;
}

export interface AbilityEstimate {
  theta: number;
  se: number;
}

export interface ItemResponse {
  isCorrect: boolean;
  irtA: number;
  irtB: number;
  irtC: number;
}

// ── Test Reliability ────────────────────────────────────────────────────

export interface ExamReliabilityReport {
  blueprintId: string;
  kr20: number;
  cronbachAlpha: number;
  sem: number;
  totalSessions: number;
  averageScore: number;
}

// ── Item Health Monitor ─────────────────────────────────────────────────

export interface HealthCheckReport {
  tenantId: string;
  totalScanned: number;
  flaggedCount: number;
  retiredCount: number;
  flaggedItemIds: string[];
  retiredItemIds: string[];
  checkedAt: Date;
}
