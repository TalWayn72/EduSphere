/**
 * ExamScoreCard component tests
 *
 * Verifies:
 *  1. Renders score display and max
 *  2. Shows confidence interval when present
 *  3. Hides confidence interval when absent
 *  4. Shows graded date
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExamScoreCard } from './ExamScoreCard';
import type { ExamResult } from '@/types/exam-entities';

const BASE_RESULT: ExamResult = {
  id: 'r1',
  sessionId: 's1',
  rawScore: 85,
  passed: true,
  domainScores: [],
  bloomScores: [],
  gradedAt: '2026-03-20T10:00:00Z',
};

describe('ExamScoreCard', () => {
  it('renders score display prominently', () => {
    render(<ExamScoreCard result={BASE_RESULT} scoreDisplay={85} scoreMax={100} />);
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('out of 100')).toBeInTheDocument();
  });

  it('shows confidence interval when present', () => {
    const result: ExamResult = {
      ...BASE_RESULT,
      confidenceInterval: { lower: 70, upper: 95 },
    };
    render(<ExamScoreCard result={result} scoreDisplay={85} scoreMax={100} />);
    expect(screen.getByText('95% Confidence Interval')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('does not show confidence interval when absent', () => {
    render(<ExamScoreCard result={BASE_RESULT} scoreDisplay={85} scoreMax={100} />);
    expect(screen.queryByText('95% Confidence Interval')).not.toBeInTheDocument();
  });

  it('shows graded date', () => {
    render(<ExamScoreCard result={BASE_RESULT} scoreDisplay={85} scoreMax={100} />);
    // Date is rendered via toLocaleDateString — just confirm "Completed:" prefix exists
    expect(screen.getByText(/Completed:/)).toBeInTheDocument();
  });
});
