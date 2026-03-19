/**
 * ExamResultPage component tests
 *
 * Verifies:
 *  1.  Shows pass banner for passing score
 *  2.  Shows fail banner for failing score
 *  3.  Displays scaled score
 *  4.  Shows domain breakdown chart
 *  5.  Shows retake button
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ExamResult } from '@/types/exam-entities';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: 'sess-1' }),
  useNavigate: () => mockNavigate,
}));

function makeResult(overrides: Partial<ExamResult> = {}): ExamResult {
  return {
    id: 'r-1',
    sessionId: 'sess-1',
    userId: 'u-1',
    blueprintId: 'bp-1',
    passed: true,
    rawScore: 0.85,
    scaledScore: 720,
    domainScores: [
      { domain: 'Math', itemCount: 10, correctCount: 9, percentage: 90 },
    ],
    bloomScores: [
      { level: 'APPLY', itemCount: 5, correctCount: 4, percentage: 80 },
    ],
    gradedAt: '2026-03-15T12:00:00Z',
    ...overrides,
  };
}

let mockResult: ExamResult | null = makeResult();
let mockLoading = false;

vi.mock('@/hooks/useExamSession', () => ({
  useExamResult: vi.fn(() => ({ result: mockResult, loading: mockLoading })),
}));

vi.mock('@/components/exam/ExamResultChart', () => ({
  DomainScoreChart: vi.fn(() => <div data-testid="domain-chart" />),
  BloomScoreChart: vi.fn(() => <div data-testid="bloom-chart" />),
}));

vi.mock('@/components/exam/ExamScoreCard', () => ({
  ExamScoreCard: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ scoreDisplay }: any) => <div data-testid="score-card">{scoreDisplay}</div>,
  ),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { ExamResultPage } from './ExamResultPage';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ExamResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = makeResult();
    mockLoading = false;
  });

  it('shows pass banner for passing score', () => {
    render(<ExamResultPage />);
    expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
    expect(screen.getByText('PASS')).toBeInTheDocument();
  });

  it('shows fail banner for failing score', () => {
    mockResult = makeResult({ passed: false });
    render(<ExamResultPage />);
    expect(screen.getByText(/not passed/i)).toBeInTheDocument();
    expect(screen.getByText('FAIL')).toBeInTheDocument();
  });

  it('displays scaled score via ExamScoreCard', () => {
    render(<ExamResultPage />);
    expect(screen.getByTestId('score-card')).toHaveTextContent('720');
  });

  it('shows domain breakdown chart', () => {
    render(<ExamResultPage />);
    expect(screen.getByTestId('domain-chart')).toBeInTheDocument();
  });

  it('shows bloom chart', () => {
    render(<ExamResultPage />);
    expect(screen.getByTestId('bloom-chart')).toBeInTheDocument();
  });

  it('shows retake button', () => {
    render(<ExamResultPage />);
    expect(screen.getByRole('button', { name: /retake exam/i })).toBeInTheDocument();
  });

  it('shows back to course button', () => {
    render(<ExamResultPage />);
    expect(screen.getByRole('button', { name: /back to course/i })).toBeInTheDocument();
  });

  it('shows not found when result is null', () => {
    mockResult = null;
    render(<ExamResultPage />);
    expect(screen.getByText(/result not found/i)).toBeInTheDocument();
  });
});
