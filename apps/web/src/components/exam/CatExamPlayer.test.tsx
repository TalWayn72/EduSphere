// @vitest-environment jsdom
/**
 * CatExamPlayer component tests
 *
 * Verifies:
 *  1. Renders CatProgressIndicator, CatExamTimer, CatQuestionCard
 *  2. Next button disabled when no answer selected
 *  3. Next button enabled when answer selected
 *  4. Shows "Submitting..." text during submission
 *  5. Returns null when terminated
 *  6. Calls onComplete when CAT terminates
 *  7. Handles time expiry
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('./CatProgressIndicator', () => ({
  CatProgressIndicator: vi.fn(() => <div data-testid="cat-progress">Progress</div>),
}));

vi.mock('./SecureExamWrapper', () => ({
  SecureExamWrapper: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
}));

vi.mock('./CatExamTimer', () => ({
  CatExamTimer: vi.fn(({ onExpired }: { onExpired: () => void }) => (
    <button data-testid="cat-timer" onClick={onExpired}>Timer</button>
  )),
}));

vi.mock('./CatQuestionCard', () => ({
  CatQuestionCard: vi.fn(({ onSelect }: { onSelect: (id: string) => void }) => (
    <button data-testid="cat-question" onClick={() => onSelect('opt-1')}>Question</button>
  )),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { CatExamPlayer } from './CatExamPlayer';
import type { ExamItem } from '@/types/exam-entities';

// ── Tests ───────────────────────────────────────────────────────────────────

const initialItem: ExamItem = {
  id: 'item-1',
  courseId: 'c1',
  domainTag: 'Math',
  bloomLevel: 'APPLY',
  questionData: { stem: 'What is 2+2?', options: [{ id: 'opt-1', text: '4' }] },
  calibrationStatus: 'CALIBRATED',
  source: 'MANUAL',
  qualityTier: 'CALIBRATED',
  exposureCount: 5,
  createdAt: '2026-01-01T00:00:00Z',
};

const baseProps = {
  sessionId: 's1',
  initialItem,
  minItems: 10,
  maxItems: 30,
  timeLimitSeconds: 3600,
  lockdownEnabled: false,
  onComplete: vi.fn(),
};

describe('CatExamPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it('renders progress indicator', () => {
    render(<CatExamPlayer {...baseProps} />);
    expect(screen.getByTestId('cat-progress')).toBeInTheDocument();
  });

  it('renders timer', () => {
    render(<CatExamPlayer {...baseProps} />);
    expect(screen.getByTestId('cat-timer')).toBeInTheDocument();
  });

  it('renders question card', () => {
    render(<CatExamPlayer {...baseProps} />);
    expect(screen.getByTestId('cat-question')).toBeInTheDocument();
  });

  it('renders Next button', () => {
    render(<CatExamPlayer {...baseProps} />);
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('Next button is disabled when no answer selected', () => {
    render(<CatExamPlayer {...baseProps} />);
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('Next button is enabled after selecting an answer', () => {
    render(<CatExamPlayer {...baseProps} />);
    // Click the mock question card to select an answer
    fireEvent.click(screen.getByTestId('cat-question'));
    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  it('shows Submitting... text when submitting', async () => {
    // Mock a slow fetch
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}), // never resolves
    );
    render(<CatExamPlayer {...baseProps} />);

    // Select answer then click Next
    fireEvent.click(screen.getByTestId('cat-question'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });

  it('calls onComplete with TIME_EXPIRED on timer expiry', () => {
    const onComplete = vi.fn();
    render(<CatExamPlayer {...baseProps} onComplete={onComplete} />);

    // Click the mock timer which triggers onExpired
    fireEvent.click(screen.getByTestId('cat-timer'));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'TIME_EXPIRED', sessionId: 's1' }),
    );
  });

  it('returns null after termination', () => {
    const onComplete = vi.fn();
    const { container } = render(<CatExamPlayer {...baseProps} onComplete={onComplete} />);

    // Terminate via timer
    fireEvent.click(screen.getByTestId('cat-timer'));
    expect(container.firstChild).toBeNull();
  });

  it('advances to next item on successful submit', async () => {
    const nextItem: ExamItem = { ...initialItem, id: 'item-2' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ terminated: false, item: nextItem }),
    });

    render(<CatExamPlayer {...baseProps} />);
    fireEvent.click(screen.getByTestId('cat-question'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      // After successful submit, answer resets so Next becomes disabled again
      expect(screen.getByText('Next')).toBeDisabled();
    });
  });

  it('calls onComplete when CAT terminates', async () => {
    const result = { sessionId: 's1', theta: 1.5, se: 0.3, reason: 'CONVERGED' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ terminated: true, result }),
    });

    const onComplete = vi.fn();
    render(<CatExamPlayer {...baseProps} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('cat-question'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(result);
    });
  });
});
