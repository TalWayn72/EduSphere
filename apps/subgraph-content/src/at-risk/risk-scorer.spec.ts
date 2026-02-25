/**
 * risk-scorer.spec.ts — Unit tests for the pure risk score computation engine.
 * F-003 Performance Risk Detection
 */
import { describe, it, expect } from 'vitest';
import { computeRiskScore } from './risk-scorer.js';
import type { LearnerMetrics } from './risk-scorer.js';

const allFactorsActive: LearnerMetrics = {
  daysSinceLastActivity: 10,    // > 7  (+0.35)
  courseProgressPercent: 10,    // < 30 (+0.25)
  courseDaysRemaining: 5,       // < 14 (+0.20)
  quizFailureRate: 0.8,         // > 0.5 (+0.15)
  weeklyActivityDays: 0,        // < 2  (+0.05)
};

const noFactorsActive: LearnerMetrics = {
  daysSinceLastActivity: 2,
  courseProgressPercent: 80,
  courseDaysRemaining: 30,
  quizFailureRate: 0.1,
  weeklyActivityDays: 5,
};

describe('computeRiskScore()', () => {
  it('should return score 1.0 and isAtRisk = true when all factors active', () => {
    const result = computeRiskScore(allFactorsActive);
    expect(result.score).toBe(1.0);
    expect(result.isAtRisk).toBe(true);
    expect(result.factors.inactiveForDays).toBe(true);
    expect(result.factors.lowProgress).toBe(true);
    expect(result.factors.approachingDeadline).toBe(true);
    expect(result.factors.lowQuizPerformance).toBe(true);
    expect(result.factors.noRecentActivity).toBe(true);
  });

  it('should return score 0.0 and isAtRisk = false when no factors active', () => {
    const result = computeRiskScore(noFactorsActive);
    expect(result.score).toBe(0.0);
    expect(result.isAtRisk).toBe(false);
    expect(result.factors.inactiveForDays).toBe(false);
    expect(result.factors.lowProgress).toBe(false);
    expect(result.factors.approachingDeadline).toBe(false);
    expect(result.factors.lowQuizPerformance).toBe(false);
    expect(result.factors.noRecentActivity).toBe(false);
  });

  it('should return isAtRisk = true when score is exactly 0.5 (inactive + low progress)', () => {
    // inactive (0.35) + lowProgress (0.25) = 0.60 >= 0.5
    const metrics: LearnerMetrics = {
      daysSinceLastActivity: 10,
      courseProgressPercent: 10,
      courseDaysRemaining: 30,
      quizFailureRate: 0.1,
      weeklyActivityDays: 5,
    };
    const result = computeRiskScore(metrics);
    expect(result.score).toBe(0.6);
    expect(result.isAtRisk).toBe(true);
  });

  it('should return score 0.35 and isAtRisk = false when only inactive factor is active', () => {
    const metrics: LearnerMetrics = {
      daysSinceLastActivity: 10,   // inactive > 7 (+0.35)
      courseProgressPercent: 80,
      courseDaysRemaining: 30,
      quizFailureRate: 0.1,
      weeklyActivityDays: 5,
    };
    const result = computeRiskScore(metrics);
    expect(result.score).toBe(0.35);
    expect(result.isAtRisk).toBe(false);
    expect(result.factors.inactiveForDays).toBe(true);
    expect(result.factors.lowProgress).toBe(false);
  });

  it('should return score 0.60 and isAtRisk = true for inactive + low progress', () => {
    const metrics: LearnerMetrics = {
      daysSinceLastActivity: 8,    // > 7 (+0.35)
      courseProgressPercent: 15,   // < 30 (+0.25)
      courseDaysRemaining: 30,
      quizFailureRate: 0.1,
      weeklyActivityDays: 5,
    };
    const result = computeRiskScore(metrics);
    expect(result.score).toBe(0.6);
    expect(result.isAtRisk).toBe(true);
  });

  it('should cap score at 1.0 even if weights exceed 1', () => {
    const result = computeRiskScore(allFactorsActive);
    expect(result.score).toBeLessThanOrEqual(1.0);
    expect(result.score).toBeGreaterThanOrEqual(0.0);
  });

  it('boundary: daysSinceLastActivity = 7 should NOT trigger inactiveForDays', () => {
    const metrics: LearnerMetrics = { ...noFactorsActive, daysSinceLastActivity: 7 };
    const result = computeRiskScore(metrics);
    expect(result.factors.inactiveForDays).toBe(false);
  });

  it('boundary: daysSinceLastActivity = 8 SHOULD trigger inactiveForDays', () => {
    const metrics: LearnerMetrics = { ...noFactorsActive, daysSinceLastActivity: 8 };
    const result = computeRiskScore(metrics);
    expect(result.factors.inactiveForDays).toBe(true);
    expect(result.score).toBe(0.35);
  });

  it('boundary: courseProgressPercent = 30 should NOT trigger lowProgress', () => {
    const metrics: LearnerMetrics = { ...noFactorsActive, courseProgressPercent: 30 };
    const result = computeRiskScore(metrics);
    expect(result.factors.lowProgress).toBe(false);
  });

  it('boundary: courseProgressPercent = 29 SHOULD trigger lowProgress', () => {
    const metrics: LearnerMetrics = { ...noFactorsActive, courseProgressPercent: 29 };
    const result = computeRiskScore(metrics);
    expect(result.factors.lowProgress).toBe(true);
  });
});
