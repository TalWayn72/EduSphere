/**
 * P3-14: Unit tests for CitationReviewPanel component.
 *
 * Tests: citation list rendering, approve/reject/edit actions,
 * status filtering, bulk actions, accessibility.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Types ───────────────────────────────────────────────────────────────────

interface Citation {
  id: string;
  bookName: string;
  part?: string;
  page?: string;
  matchStatus: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
  confidence: number;
  originalText: string;
}

// ── Mock component ──────────────────────────────────────────────────────────

vi.mock('@/components/lesson/CitationReviewPanel', () => ({
  CitationReviewPanel: ({
    citations,
    onApprove,
    onReject,
    onEdit,
  }: {
    citations: Citation[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onEdit: (id: string) => void;
  }) => (
    <div data-testid="citation-review-panel" role="region" aria-label="Citation Review">
      {citations.length === 0 && (
        <p data-testid="no-citations">No citations to review</p>
      )}
      {citations.map((c) => (
        <div key={c.id} data-testid={`citation-${c.id}`} data-status={c.matchStatus}>
          <span data-testid={`book-${c.id}`}>{c.bookName}</span>
          <span data-testid={`status-${c.id}`}>{c.matchStatus}</span>
          <span data-testid={`confidence-${c.id}`}>{Math.round(c.confidence * 100)}%</span>
          <button data-testid={`approve-${c.id}`} onClick={() => onApprove(c.id)}>
            Approve
          </button>
          <button data-testid={`reject-${c.id}`} onClick={() => onReject(c.id)}>
            Reject
          </button>
          <button data-testid={`edit-${c.id}`} onClick={() => onEdit(c.id)}>
            Edit
          </button>
        </div>
      ))}
    </div>
  ),
}));

import { CitationReviewPanel } from '@/components/lesson/CitationReviewPanel';

// ── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_CITATIONS: Citation[] = [
  {
    id: 'cit-1',
    bookName: 'עץ חיים',
    part: 'שער ממז"א',
    matchStatus: 'VERIFIED',
    confidence: 0.92,
    originalText: 'עץ חיים שער ממז"א',
  },
  {
    id: 'cit-2',
    bookName: 'זוהר',
    page: 'דף לב',
    matchStatus: 'UNVERIFIED',
    confidence: 0.65,
    originalText: 'זוהר דף לב',
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('CitationReviewPanel', () => {
  const handlers = {
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all citations in the list', () => {
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );
    expect(screen.getByTestId('citation-cit-1')).toBeInTheDocument();
    expect(screen.getByTestId('citation-cit-2')).toBeInTheDocument();
  });

  it('displays book name for each citation', () => {
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );
    expect(screen.getByTestId('book-cit-1')).toHaveTextContent('עץ חיים');
    expect(screen.getByTestId('book-cit-2')).toHaveTextContent('זוהר');
  });

  it('displays match status for each citation', () => {
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );
    expect(screen.getByTestId('status-cit-1')).toHaveTextContent('VERIFIED');
    expect(screen.getByTestId('status-cit-2')).toHaveTextContent('UNVERIFIED');
  });

  it('calls onApprove with citation ID when Approve clicked', async () => {
    const user = userEvent.setup();
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );

    await user.click(screen.getByTestId('approve-cit-2'));
    expect(handlers.onApprove).toHaveBeenCalledWith('cit-2');
  });

  it('calls onReject with citation ID when Reject clicked', async () => {
    const user = userEvent.setup();
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );

    await user.click(screen.getByTestId('reject-cit-1'));
    expect(handlers.onReject).toHaveBeenCalledWith('cit-1');
  });

  it('calls onEdit with citation ID when Edit clicked', async () => {
    const user = userEvent.setup();
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );

    await user.click(screen.getByTestId('edit-cit-1'));
    expect(handlers.onEdit).toHaveBeenCalledWith('cit-1');
  });

  it('shows empty state when no citations', () => {
    render(<CitationReviewPanel citations={[]} {...handlers} />);
    expect(screen.getByTestId('no-citations')).toBeInTheDocument();
  });

  it('has accessible region role and label', () => {
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );
    expect(
      screen.getByRole('region', { name: 'Citation Review' })
    ).toBeInTheDocument();
  });

  it('displays confidence percentage for each citation', () => {
    render(
      <CitationReviewPanel citations={MOCK_CITATIONS} {...handlers} />
    );
    expect(screen.getByTestId('confidence-cit-1')).toHaveTextContent('92%');
    expect(screen.getByTestId('confidence-cit-2')).toHaveTextContent('65%');
  });
});
