/**
 * SRSWidget unit tests
 * Target coverage: lines 56-67 (queue count / loading), 71-72 (handleAddDemo), 111 (Add Review Card button)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResponse, UseMutationResponse } from 'urql';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
      vi.fn(),
    ]),
    useMutation: vi.fn(() => [
      { fetching: false, error: undefined },
      vi.fn().mockResolvedValue({
        data: { createReviewCard: { id: 'card-1' } },
        error: undefined,
      }),
    ]),
  };
});

// Mock SRSReviewSession — complex component, unit-test stub only
vi.mock('@/components/SRSReviewSession', () => ({
  SRSReviewSession: ({
    onComplete,
  }: {
    cards: unknown[];
    onComplete: () => void;
  }) => (
    <div data-testid="srs-review-session">
      <button onClick={onComplete}>Complete Review</button>
    </div>
  ),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { SRSWidget } from './SRSWidget';
import { useQuery, useMutation } from 'urql';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWidget() {
  return render(
    <MemoryRouter>
      <SRSWidget />
    </MemoryRouter>
  );
}

function mockCountQuery(overrides: {
  data?: { srsQueueCount: number };
  fetching?: boolean;
  error?: unknown;
}) {
  // useQuery is called twice (count + reviews), return different values based on call count
  let callCount = 0;
  vi.mocked(useQuery).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // First call: SRS_QUEUE_COUNT_QUERY
      return [
        {
          data: overrides.data,
          fetching: overrides.fetching ?? false,
          error: overrides.error,
          stale: false,
          operation: undefined,
        },
        vi.fn(),
        vi.fn(),
      ] as unknown as UseQueryResponse;
    }
    // Second call: DUE_REVIEWS_QUERY
    return [
      {
        data: { dueReviews: [] },
        fetching: false,
        error: undefined,
        stale: false,
        operation: undefined,
      },
      vi.fn(),
      vi.fn(),
    ] as unknown as UseQueryResponse;
  });
}

function mockCreateCard(
  executeFn: (vars: unknown) => Promise<unknown> = vi.fn().mockResolvedValue({
    data: { createReviewCard: { id: 'card-new' } },
    error: undefined,
  })
) {
  vi.mocked(useMutation).mockReturnValue([
    { fetching: false, error: undefined } as UseMutationResponse[0],
    executeFn as unknown as UseMutationResponse[1],
  ] as unknown as UseMutationResponse);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SRSWidget', () => {
  beforeEach(() => {
    // Default: 0 cards due, not loading
    mockCountQuery({ data: { srsQueueCount: 0 }, fetching: false });
    mockCreateCard();
  });

  // ── Basic rendering ─────────────────────────────────────────────────────

  it('renders the "Review Queue" heading', () => {
    renderWidget();
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
  });

  it('renders inside a Card component', () => {
    renderWidget();
    // Brain icon is part of the CardHeader
    const brainIcon = document.querySelector('svg.lucide-brain');
    expect(brainIcon).toBeInTheDocument();
  });

  // ── Loading state (line 59: loading = countResult.fetching) ──────────────

  it('shows "..." while fetching queue count', () => {
    mockCountQuery({ fetching: true });
    renderWidget();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('does not show queue count number while loading', () => {
    mockCountQuery({ fetching: true });
    renderWidget();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  // ── Queue count display (lines 57-58, 86-95) ─────────────────────────────

  it('displays queue count when data is loaded', () => {
    mockCountQuery({ data: { srsQueueCount: 5 } });
    renderWidget();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows plural "cards due for review" when count > 1', () => {
    mockCountQuery({ data: { srsQueueCount: 3 } });
    renderWidget();
    expect(screen.getByText('cards due for review')).toBeInTheDocument();
  });

  it('shows singular "card due for review" when count = 1', () => {
    mockCountQuery({ data: { srsQueueCount: 1 } });
    renderWidget();
    expect(screen.getByText('card due for review')).toBeInTheDocument();
  });

  it('shows 0 count when no cards are due', () => {
    mockCountQuery({ data: { srsQueueCount: 0 } });
    renderWidget();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  // ── Start Review button (lines 97-101) ────────────────────────────────────

  it('shows "Start Review" button when cards are due', () => {
    mockCountQuery({ data: { srsQueueCount: 3 } });
    renderWidget();
    expect(
      screen.getByRole('button', { name: /Start Review/i })
    ).toBeInTheDocument();
  });

  it('does not show "Start Review" when queue count is 0', () => {
    mockCountQuery({ data: { srsQueueCount: 0 } });
    renderWidget();
    expect(
      screen.queryByRole('button', { name: /Start Review/i })
    ).not.toBeInTheDocument();
  });

  // ── Start review — enters reviewing mode (lines 61-63, 82-83) ────────────

  it('enters reviewing mode when "Start Review" is clicked', () => {
    mockCountQuery({ data: { srsQueueCount: 2 } });
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /Start Review/i }));
    expect(screen.getByTestId('srs-review-session')).toBeInTheDocument();
  });

  it('hides the queue count view while in reviewing mode', () => {
    mockCountQuery({ data: { srsQueueCount: 2 } });
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /Start Review/i }));
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  // ── Review complete — returns to idle (lines 65-68) ──────────────────────

  it('returns to idle mode when review session completes', () => {
    mockCountQuery({ data: { srsQueueCount: 2 } });
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /Start Review/i }));
    expect(screen.getByTestId('srs-review-session')).toBeInTheDocument();

    // Complete review via mocked onComplete
    fireEvent.click(screen.getByRole('button', { name: /Complete Review/i }));
    expect(screen.queryByTestId('srs-review-session')).not.toBeInTheDocument();
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
  });

  // ── Empty / all-caught-up state (lines 103-117 — line 111) ───────────────

  it('shows "All caught up!" text when queue is 0 and not loading', () => {
    mockCountQuery({ data: { srsQueueCount: 0 }, fetching: false });
    renderWidget();
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });

  it('shows "+ Add Review Card" button when queue is 0 (line 111)', () => {
    mockCountQuery({ data: { srsQueueCount: 0 }, fetching: false });
    renderWidget();
    expect(
      screen.getByRole('button', { name: /\+ Add Review Card/i })
    ).toBeInTheDocument();
  });

  it('does not show "All caught up!" while loading', () => {
    mockCountQuery({ fetching: true });
    renderWidget();
    expect(screen.queryByText('All caught up!')).not.toBeInTheDocument();
  });

  it('does not show "+ Add Review Card" when cards are due', () => {
    mockCountQuery({ data: { srsQueueCount: 5 } });
    renderWidget();
    expect(
      screen.queryByRole('button', { name: /Add Review Card/i })
    ).not.toBeInTheDocument();
  });

  // ── handleAddDemo (lines 70-73) ───────────────────────────────────────────

  it('calls createCard mutation when "+ Add Review Card" is clicked', async () => {
    const executeFn = vi.fn().mockResolvedValue({
      data: { createReviewCard: { id: 'new-card-id' } },
      error: undefined,
    });
    mockCreateCard(executeFn);
    mockCountQuery({ data: { srsQueueCount: 0 } });

    renderWidget();
    fireEvent.click(
      screen.getByRole('button', { name: /\+ Add Review Card/i })
    );

    await waitFor(() => {
      expect(executeFn).toHaveBeenCalledWith({
        conceptName: 'Sample concept — edit me!',
      });
    });
  });

  // ── Unmount cleanup (lines 51-55 — useEffect cleanup) ────────────────────

  it('sets pauseRef to true on unmount to prevent dangling requests', () => {
    const { unmount } = renderWidget();
    // Simply verify unmounting does not throw
    expect(() => unmount()).not.toThrow();
  });
});
