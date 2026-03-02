import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock urql — provide gql as identity tag so srs.queries.ts can load synchronously
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// Mock Layout to avoid rendering the full nav/header with its own hooks
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock auth so getCurrentUser() returns a stable dev user
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'dev-user-1',
    username: 'developer',
    role: 'STUDENT',
  })),
  isAuthenticated: vi.fn(() => true),
}));

// Mock useSrsSession so page tests are isolated from hook logic
vi.mock('@/hooks/useSrsSession');

import { SrsReviewPage } from './SrsReviewPage';
import { useSrsSession } from '@/hooks/useSrsSession';

// ── Helpers ────────────────────────────────────────────────────────────────

const mockCard = {
  id: 'card-1',
  conceptName: 'Photosynthesis',
  dueDate: '2026-02-27T00:00:00Z',
  intervalDays: 3,
  easeFactor: 2.5,
  repetitions: 2,
  lastReviewedAt: null,
};

const defaultSession = {
  currentCard: mockCard,
  totalDue: 3,
  fetching: false,
  error: undefined,
  submitRating: vi.fn(),
  sessionComplete: false,
  stats: { correct: 0, incorrect: 0 },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SrsReviewPage />
    </MemoryRouter>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SrsReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSrsSession).mockReturnValue(defaultSession);
  });

  it('renders "No cards due" when totalDue === 0 and not loading', () => {
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      currentCard: null,
      totalDue: 0,
    });
    renderPage();
    expect(screen.getByTestId('no-cards-due')).toBeInTheDocument();
  });

  it('renders card conceptName when a card is present', () => {
    renderPage();
    expect(screen.getByTestId('concept-name')).toHaveTextContent(
      'Photosynthesis'
    );
  });

  it('does NOT show rating buttons before flipping the card', () => {
    renderPage();
    expect(screen.queryByTestId('rating-buttons')).not.toBeInTheDocument();
  });

  it('shows card back content after clicking flip button', () => {
    renderPage();
    const flipBtn = screen.getByTestId('flip-button');
    fireEvent.click(flipBtn);
    // Card back content (interval / ease) becomes visible
    expect(screen.getByText(/Interval/i)).toBeInTheDocument();
  });

  it('shows rating buttons after flipping the card', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('flip-button'));
    expect(screen.getByTestId('rating-buttons')).toBeInTheDocument();
  });

  it('calls submitRating(0) when "Again" is clicked', () => {
    const mockSubmit = vi.fn();
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      submitRating: mockSubmit,
    });
    renderPage();
    fireEvent.click(screen.getByTestId('flip-button'));
    fireEvent.click(screen.getByTestId('rate-again'));
    expect(mockSubmit).toHaveBeenCalledWith(0);
  });

  it('calls submitRating(3) when "Good" is clicked', () => {
    const mockSubmit = vi.fn();
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      submitRating: mockSubmit,
    });
    renderPage();
    fireEvent.click(screen.getByTestId('flip-button'));
    fireEvent.click(screen.getByTestId('rate-good'));
    expect(mockSubmit).toHaveBeenCalledWith(3);
  });

  it('calls submitRating(5) when "Easy" is clicked', () => {
    const mockSubmit = vi.fn();
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      submitRating: mockSubmit,
    });
    renderPage();
    fireEvent.click(screen.getByTestId('flip-button'));
    fireEvent.click(screen.getByTestId('rate-easy'));
    expect(mockSubmit).toHaveBeenCalledWith(5);
  });

  it('shows "Session Complete!" when sessionComplete is true', () => {
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      sessionComplete: true,
      stats: { correct: 4, incorrect: 1 },
    });
    renderPage();
    expect(screen.getByTestId('session-complete')).toBeInTheDocument();
    expect(screen.getByTestId('session-complete-title')).toBeInTheDocument();
  });

  it('shows correct and incorrect counts in session summary', () => {
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      sessionComplete: true,
      stats: { correct: 7, incorrect: 2 },
    });
    renderPage();
    expect(screen.getByTestId('correct-count')).toHaveTextContent('7');
    expect(screen.getByTestId('incorrect-count')).toHaveTextContent('2');
  });

  it('shows loading text while fetching', () => {
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      fetching: true,
      currentCard: null,
      totalDue: 0,
    });
    renderPage();
    expect(screen.getByTestId('loading-text')).toBeInTheDocument();
  });

  it('renders card progress indicator with multiple cards', () => {
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      totalDue: 5,
    });
    renderPage();
    expect(screen.getByTestId('card-progress')).toHaveTextContent(
      'Card 1 of 5'
    );
  });

  it('hides flip button and shows rating buttons after flip', () => {
    renderPage();
    expect(screen.getByTestId('flip-button')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('flip-button'));
    // After flip the "Show Answer" button should be gone
    expect(screen.queryByTestId('flip-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('rating-buttons')).toBeInTheDocument();
  });

  it('flipping card via flashcard click also reveals rating buttons', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('flashcard'));
    expect(screen.getByTestId('rating-buttons')).toBeInTheDocument();
  });

  it('shows error state when query fails', () => {
    vi.mocked(useSrsSession).mockReturnValue({
      ...defaultSession,
      fetching: false,
      error: new Error('Network error') as ReturnType<typeof Error>,
      currentCard: null,
      totalDue: 0,
    });
    renderPage();
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    // error.message is rendered verbatim (not translated)
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('wraps content in Layout', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });
});
