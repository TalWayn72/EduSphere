/**
 * risk-scorer.ts — Pure risk score computation engine (no DB dependencies).
 * All weights and thresholds are constants so they can be tuned without
 * touching the service layer.
 *
 * F-003 Performance Risk Detection
 */

export interface LearnerMetrics {
  daysSinceLastActivity: number;
  courseProgressPercent: number;
  courseDaysRemaining: number;
  /** Fraction of quiz attempts that failed: 0.0 – 1.0 */
  quizFailureRate: number;
  /** Number of days the learner was active in the last 7 days: 0–7 */
  weeklyActivityDays: number;
}

export interface RiskFactors {
  inactiveForDays: boolean;
  lowProgress: boolean;
  approachingDeadline: boolean;
  lowQuizPerformance: boolean;
  noRecentActivity: boolean;
}

export interface RiskAssessment {
  score: number;       // 0.0 – 1.0 (capped)
  factors: RiskFactors;
  isAtRisk: boolean;   // score >= AT_RISK_THRESHOLD
}

// ── Thresholds ────────────────────────────────────────────────────────────────
const INACTIVE_DAYS_THRESHOLD   = 7;
const LOW_PROGRESS_THRESHOLD    = 30;   // percent
const DEADLINE_THRESHOLD_DAYS   = 14;
const HIGH_FAILURE_RATE         = 0.5;
const LOW_WEEKLY_ACTIVITY_DAYS  = 2;
const AT_RISK_THRESHOLD         = 0.5;

// ── Score weights (must sum to ≤ 1.0) ────────────────────────────────────────
const W_INACTIVE   = 0.35;
const W_PROGRESS   = 0.25;
const W_DEADLINE   = 0.20;
const W_QUIZ       = 0.15;
const W_WEEKLY     = 0.05;

/**
 * Compute a risk score for a single learner in a single course.
 * Pure function — no side effects, no I/O.
 */
export function computeRiskScore(metrics: LearnerMetrics): RiskAssessment {
  const factors: RiskFactors = {
    inactiveForDays:      metrics.daysSinceLastActivity > INACTIVE_DAYS_THRESHOLD,
    lowProgress:          metrics.courseProgressPercent < LOW_PROGRESS_THRESHOLD,
    approachingDeadline:  metrics.courseDaysRemaining < DEADLINE_THRESHOLD_DAYS,
    lowQuizPerformance:   metrics.quizFailureRate > HIGH_FAILURE_RATE,
    noRecentActivity:     metrics.weeklyActivityDays < LOW_WEEKLY_ACTIVITY_DAYS,
  };

  let score = 0;
  if (factors.inactiveForDays)     score += W_INACTIVE;
  if (factors.lowProgress)         score += W_PROGRESS;
  if (factors.approachingDeadline) score += W_DEADLINE;
  if (factors.lowQuizPerformance)  score += W_QUIZ;
  if (factors.noRecentActivity)    score += W_WEEKLY;

  // Cap at 1.0 in case weights are adjusted in the future
  const finalScore = Math.min(score, 1.0);

  return {
    score:     Math.round(finalScore * 1000) / 1000, // 3 decimal places
    factors,
    isAtRisk:  finalScore >= AT_RISK_THRESHOLD,
  };
}
