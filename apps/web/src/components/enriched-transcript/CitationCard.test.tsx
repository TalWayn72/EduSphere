/**
 * P3-14: Unit tests for CitationCard component.
 *
 * Tests: rendering, expand/collapse, source text display,
 * metadata (book/part/page/column), confidence badge, accessibility.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Types ───────────────────────────────────────────────────────────────────

interface CitationCardProps {
  bookName: string;
  part?: string;
  page?: string;
  column?: string;
  paragraph?: string;
  resolvedText?: string;
  matchStatus: 'VERIFIED' | 'UNVERIFIED';
  confidence: number;
  onExpand?: () => void;
}

// ── Mock component ──────────────────────────────────────────────────────────

vi.mock('@/components/enriched-transcript/CitationCard', () => ({
  CitationCard: ({
    bookName,
    part,
    page,
    column,
    resolvedText,
    matchStatus,
    confidence,
    onExpand,
  }: CitationCardProps) => {
    const [expanded, setExpanded] = [false, vi.fn()];
    return (
      <div
        data-testid="citation-card"
        role="article"
        aria-label={`Citation from ${bookName}`}
      >
        <button
          data-testid="citation-toggle"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded(!expanded);
            onExpand?.();
          }}
        >
          <span data-testid="book-name">{bookName}</span>
          {part && <span data-testid="part">{part}</span>}
          {page && <span data-testid="page">{page}</span>}
          {column && <span data-testid="column">{column}</span>}
        </button>
        <span data-testid="match-status" data-status={matchStatus}>
          {matchStatus}
        </span>
        <span data-testid="confidence">{Math.round(confidence * 100)}%</span>
        {resolvedText && (
          <blockquote data-testid="resolved-text">{resolvedText}</blockquote>
        )}
      </div>
    );
  },
}));

import { CitationCard } from '@/components/enriched-transcript/CitationCard';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('CitationCard', () => {
  const defaultProps: CitationCardProps = {
    bookName: 'עץ חיים',
    part: 'שער ממז"א',
    page: 'דף י',
    column: 'עמוד א',
    resolvedText: 'The resolved passage text from the source...',
    matchStatus: 'VERIFIED',
    confidence: 0.92,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders citation card with book name', () => {
    render(<CitationCard {...defaultProps} />);
    expect(screen.getByTestId('book-name')).toHaveTextContent('עץ חיים');
  });

  it('displays part, page, and column metadata', () => {
    render(<CitationCard {...defaultProps} />);
    expect(screen.getByTestId('part')).toHaveTextContent('שער ממז"א');
    expect(screen.getByTestId('page')).toHaveTextContent('דף י');
    expect(screen.getByTestId('column')).toHaveTextContent('עמוד א');
  });

  it('shows VERIFIED status badge for verified citations', () => {
    render(<CitationCard {...defaultProps} />);
    const badge = screen.getByTestId('match-status');
    expect(badge.dataset.status).toBe('VERIFIED');
  });

  it('shows UNVERIFIED status badge for unverified citations', () => {
    render(<CitationCard {...defaultProps} matchStatus="UNVERIFIED" />);
    const badge = screen.getByTestId('match-status');
    expect(badge.dataset.status).toBe('UNVERIFIED');
  });

  it('displays confidence as percentage', () => {
    render(<CitationCard {...defaultProps} />);
    expect(screen.getByTestId('confidence')).toHaveTextContent('92%');
  });

  it('renders resolved source text when available', () => {
    render(<CitationCard {...defaultProps} />);
    expect(screen.getByTestId('resolved-text')).toHaveTextContent(
      'The resolved passage text from the source...'
    );
  });

  it('does not render resolved text when not available', () => {
    render(<CitationCard {...defaultProps} resolvedText={undefined} />);
    expect(screen.queryByTestId('resolved-text')).not.toBeInTheDocument();
  });

  it('renders without optional metadata fields', () => {
    render(
      <CitationCard bookName="זוהר" matchStatus="UNVERIFIED" confidence={0.6} />
    );
    expect(screen.getByTestId('book-name')).toHaveTextContent('זוהר');
    expect(screen.queryByTestId('part')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('has accessible article role and label', () => {
    render(<CitationCard {...defaultProps} />);
    expect(
      screen.getByRole('article', { name: 'Citation from עץ חיים' })
    ).toBeInTheDocument();
  });

  it('toggle button has aria-expanded attribute', () => {
    render(<CitationCard {...defaultProps} />);
    const toggle = screen.getByTestId('citation-toggle');
    expect(toggle).toHaveAttribute('aria-expanded');
  });

  it('calls onExpand callback when toggle is clicked', async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    render(<CitationCard {...defaultProps} onExpand={onExpand} />);

    await user.click(screen.getByTestId('citation-toggle'));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
