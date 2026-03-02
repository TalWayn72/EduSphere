import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { SRSReviewSession } from './SRSReviewSession';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/srs.queries', () => ({
  SUBMIT_REVIEW_MUTATION: 'SUBMIT_REVIEW_MUTATION',
}));

const mockSubmitReview = vi.fn();

const CARDS = [
  { id: 'c1', conceptName: 'Binary Search' },
  { id: 'c2', conceptName: 'Merge Sort' },
  { id: 'c3', conceptName: 'Hash Map' },
];

const defaultProps = {
  cards: CARDS,
  onComplete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSubmitReview.mockResolvedValue({ data: { submitReview: { id: 'r1' } } });
  vi.mocked(urql.useMutation).mockReturnValue([
    {} as never,
    mockSubmitReview as never,
  ]);
});

describe('SRSReviewSession', () => {
  it('shows progress counter "1 / N"', () => {
    render(<SRSReviewSession {...defaultProps} />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('shows "?" placeholder before card is flipped', () => {
    render(<SRSReviewSession {...defaultProps} />);
    expect(screen.getByText(/click to reveal/i)).toBeInTheDocument();
  });

  it('has "Click to reveal concept" aria-label before flip', () => {
    render(<SRSReviewSession {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /click to reveal concept/i })
    ).toBeInTheDocument();
  });

  it('reveals concept name after clicking the card', () => {
    render(<SRSReviewSession {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /click to reveal/i }));
    expect(screen.getByText('Binary Search')).toBeInTheDocument();
  });

  it('shows quality buttons after flipping the card', () => {
    render(<SRSReviewSession {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /click to reveal/i }));
    expect(screen.getByRole('button', { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /good/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /easy/i })).toBeInTheDocument();
  });

  it('does not show quality buttons before flipping', () => {
    render(<SRSReviewSession {...defaultProps} />);
    expect(
      screen.queryByRole('button', { name: /again/i })
    ).not.toBeInTheDocument();
  });

  it('calls submitReview with correct cardId and quality', async () => {
    render(<SRSReviewSession {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /click to reveal/i }));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));
    await waitFor(() =>
      expect(mockSubmitReview).toHaveBeenCalledWith({
        cardId: 'c1',
        quality: 4,
      })
    );
  });

  it('advances to the next card after rating', async () => {
    render(<SRSReviewSession {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /click to reveal/i }));
    fireEvent.click(screen.getByRole('button', { name: /easy/i }));
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());
  });

  it('shows "All caught up!" when cards array is empty', () => {
    render(<SRSReviewSession cards={[]} onComplete={vi.fn()} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('calls onComplete after rating the last card', async () => {
    const onComplete = vi.fn();
    render(<SRSReviewSession cards={[CARDS[0]!]} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /click to reveal/i }));
    fireEvent.click(screen.getByRole('button', { name: /easy/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('shows "Again" with quality 1 and "Hard" with quality 3', async () => {
    render(<SRSReviewSession {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /click to reveal/i }));
    fireEvent.click(screen.getByRole('button', { name: /again/i }));
    await waitFor(() =>
      expect(mockSubmitReview).toHaveBeenCalledWith({
        cardId: 'c1',
        quality: 1,
      })
    );
  });
});
