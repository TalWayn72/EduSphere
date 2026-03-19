/**
 * ExamResultChart component tests (DomainScoreChart + BloomScoreChart)
 *
 * Verifies:
 *  1.  Renders domain score bars
 *  2.  Colors bars green above passing threshold
 *  3.  Colors bars red below passing threshold
 *  4.  Renders bloom level bars
 *  5.  Returns null for empty scores
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DomainScoreChart, BloomScoreChart } from './ExamResultChart';
import type { DomainScore, BloomScore } from '@/types/exam-entities';

// ── Fixtures ────────────────────────────────────────────────────────────────

const DOMAIN_SCORES: DomainScore[] = [
  { domain: 'Mathematics', total: 10, correct: 8 },
  { domain: 'Physics', total: 10, correct: 5 },
];

const BLOOM_SCORES: BloomScore[] = [
  { level: 'REMEMBER', total: 5, correct: 4 },
  { level: 'APPLY', total: 5, correct: 3 },
  { level: 'CREATE', total: 5, correct: 2 },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('DomainScoreChart', () => {
  it('renders domain names and score text', () => {
    render(<DomainScoreChart scores={DOMAIN_SCORES} passingPercentage={70} />);
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
    expect(screen.getByText('8/10 (80%)')).toBeInTheDocument();
    expect(screen.getByText('5/10 (50%)')).toBeInTheDocument();
  });

  it('renders green bar for domain above passing threshold', () => {
    const { container } = render(
      <DomainScoreChart scores={DOMAIN_SCORES} passingPercentage={70} />,
    );
    const bars = container.querySelectorAll('.rounded-full.transition-all');
    // First bar (80%) should be green, second (50%) should be red
    expect(bars[0]?.className).toContain('green');
    expect(bars[1]?.className).toContain('red');
  });

  it('returns null when scores array is empty', () => {
    const { container } = render(<DomainScoreChart scores={[]} passingPercentage={70} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('BloomScoreChart', () => {
  it('renders bloom level names (lowercased)', () => {
    render(<BloomScoreChart scores={BLOOM_SCORES} />);
    expect(screen.getByText('remember')).toBeInTheDocument();
    expect(screen.getByText('apply')).toBeInTheDocument();
    expect(screen.getByText('create')).toBeInTheDocument();
  });

  it('renders score text for each bloom level', () => {
    render(<BloomScoreChart scores={BLOOM_SCORES} />);
    expect(screen.getByText('4/5 (80%)')).toBeInTheDocument();
    expect(screen.getByText('3/5 (60%)')).toBeInTheDocument();
    expect(screen.getByText('2/5 (40%)')).toBeInTheDocument();
  });

  it('returns null when scores array is empty', () => {
    const { container } = render(<BloomScoreChart scores={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
