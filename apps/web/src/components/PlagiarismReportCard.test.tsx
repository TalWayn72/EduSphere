import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlagiarismReportCard } from './PlagiarismReportCard';

const CLEAR_REPORT = {
  submissionId: 'sub-1',
  isFlagged: false,
  highestSimilarity: 0.12,
  similarSubmissions: [],
  checkedAt: '2026-01-15T10:00:00Z',
};

const FLAGGED_REPORT = {
  submissionId: 'sub-2',
  isFlagged: true,
  highestSimilarity: 0.88,
  similarSubmissions: [
    {
      submissionId: 'sub-3',
      userId: 'u2',
      similarity: 0.88,
      submittedAt: '2026-01-10T08:00:00Z',
    },
    {
      submissionId: 'sub-4',
      userId: 'u3',
      similarity: 0.65,
      submittedAt: '2026-01-12T09:00:00Z',
    },
  ],
  checkedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlagiarismReportCard', () => {
  it('renders "Plagiarism Report" heading', () => {
    render(<PlagiarismReportCard report={CLEAR_REPORT} />);
    expect(screen.getByText('Plagiarism Report')).toBeInTheDocument();
  });

  it('shows "Clear" badge when not flagged', () => {
    render(<PlagiarismReportCard report={CLEAR_REPORT} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('shows "Flagged" badge when isFlagged=true', () => {
    render(<PlagiarismReportCard report={FLAGGED_REPORT} />);
    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });

  it('shows highest similarity percentage', () => {
    render(<PlagiarismReportCard report={FLAGGED_REPORT} />);
    expect(screen.getAllByText('88%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Similar Submissions" section when submissions exist', () => {
    render(<PlagiarismReportCard report={FLAGGED_REPORT} />);
    expect(screen.getByText('Similar Submissions')).toBeInTheDocument();
  });

  it('does not show "Similar Submissions" section when empty', () => {
    render(<PlagiarismReportCard report={CLEAR_REPORT} />);
    expect(screen.queryByText('Similar Submissions')).not.toBeInTheDocument();
  });

  it('shows similarity percentage for each similar submission', () => {
    render(<PlagiarismReportCard report={FLAGGED_REPORT} />);
    // 88% appears once for highestSimilarity bar and once for first similar submission
    const eightyEightPct = screen.getAllByText('88%');
    expect(eightyEightPct.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('shows "Review" buttons for instructor view', () => {
    render(
      <PlagiarismReportCard
        report={FLAGGED_REPORT}
        isInstructor={true}
        onReview={vi.fn()}
      />
    );
    const reviewBtns = screen.getAllByRole('button', { name: /review/i });
    expect(reviewBtns).toHaveLength(2);
  });

  it('does not show "Review" buttons for non-instructor', () => {
    render(
      <PlagiarismReportCard
        report={FLAGGED_REPORT}
        isInstructor={false}
        onReview={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('button', { name: /review/i })
    ).not.toBeInTheDocument();
  });

  it('calls onReview with submissionId when Review is clicked', () => {
    const onReview = vi.fn();
    render(
      <PlagiarismReportCard
        report={FLAGGED_REPORT}
        isInstructor={true}
        onReview={onReview}
      />
    );
    fireEvent.click(screen.getAllByRole('button', { name: /review/i })[0]!);
    expect(onReview).toHaveBeenCalledWith('sub-3');
  });

  it('shows "Checked at" timestamp', () => {
    render(<PlagiarismReportCard report={CLEAR_REPORT} />);
    expect(screen.getByText(/checked at/i)).toBeInTheDocument();
  });
});
