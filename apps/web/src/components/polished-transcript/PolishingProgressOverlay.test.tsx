/**
 * Unit tests for PolishingProgressOverlay.
 *
 * Covers:
 * - Shows spinner while status is PROCESSING
 * - Calls onComplete immediately when poll returns COMPLETED on mount
 * - Calls onComplete when subscription reports COMPLETED
 * - Calls onError when status is FAILED
 * - Updates progress display from subscription data
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolishingProgressOverlay } from './PolishingProgressOverlay';

// ── urql mock ─────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
const mockUseSubscription = vi.fn();

vi.mock('urql', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useSubscription: (...args: unknown[]) => mockUseSubscription(...args),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'polishedTranscript.processing') {
        return `AI ${opts?.progress ?? 0}% ...מעבד תמליל`;
      }
      if (key === 'polishedTranscript.processingHint') {
        return 'זה עשוי לקחת מספר דקות';
      }
      return key;
    },
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks({
  subStatus,
  subProgress,
  pollStatus,
}: {
  subStatus?: string;
  subProgress?: number;
  pollStatus?: string;
}) {
  mockUseSubscription.mockReturnValue([
    {
      data: subStatus
        ? {
            polishingProgress: {
              lessonId: 'l1',
              progress: subProgress ?? 0,
              status: subStatus,
            },
          }
        : undefined,
    },
  ]);

  mockUseQuery.mockReturnValue([
    {
      data: pollStatus
        ? { polishedTranscript: { id: 'pt1', status: pollStatus } }
        : undefined,
    },
  ]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PolishingProgressOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders spinner while status is PROCESSING', () => {
    setupMocks({ pollStatus: 'PROCESSING' });

    render(<PolishingProgressOverlay lessonId="l1" />);

    expect(
      screen.getByTestId('polishing-progress-overlay')
    ).toBeInTheDocument();
    expect(screen.getByText(/מעבד תמליל/)).toBeInTheDocument();
  });

  it('shows 0% progress when no subscription data yet', () => {
    setupMocks({ pollStatus: 'PROCESSING' });

    render(<PolishingProgressOverlay lessonId="l1" />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('reflects progress from subscription data', () => {
    setupMocks({
      subStatus: 'PROCESSING',
      subProgress: 65,
      pollStatus: 'PROCESSING',
    });

    render(<PolishingProgressOverlay lessonId="l1" />);

    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText(/AI 65%/)).toBeInTheDocument();
  });

  it('calls onComplete and hides spinner when poll returns COMPLETED on mount', async () => {
    const onComplete = vi.fn();
    setupMocks({ pollStatus: 'COMPLETED' });

    render(<PolishingProgressOverlay lessonId="l1" onComplete={onComplete} />);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    // Spinner should not be in DOM after terminal state
    expect(
      screen.queryByTestId('polishing-progress-overlay')
    ).not.toBeInTheDocument();
  });

  it('calls onComplete when subscription delivers COMPLETED', async () => {
    const onComplete = vi.fn();
    setupMocks({
      subStatus: 'COMPLETED',
      subProgress: 100,
      pollStatus: 'PROCESSING',
    });

    render(<PolishingProgressOverlay lessonId="l1" onComplete={onComplete} />);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onError when status is FAILED', async () => {
    const onError = vi.fn();
    setupMocks({ pollStatus: 'FAILED' });

    render(<PolishingProgressOverlay lessonId="l1" onError={onError} />);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  it('does not double-fire terminal callbacks on re-render', async () => {
    const onComplete = vi.fn();
    setupMocks({ pollStatus: 'COMPLETED' });

    const { rerender } = render(
      <PolishingProgressOverlay lessonId="l1" onComplete={onComplete} />
    );

    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    rerender(
      <PolishingProgressOverlay lessonId="l1" onComplete={onComplete} />
    );
    rerender(
      <PolishingProgressOverlay lessonId="l1" onComplete={onComplete} />
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('passes lessonId to both subscription and query hooks', () => {
    setupMocks({ pollStatus: 'PROCESSING' });

    render(<PolishingProgressOverlay lessonId="lesson-abc" />);

    expect(mockUseSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { lessonId: 'lesson-abc' } })
    );
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { lessonId: 'lesson-abc' } })
    );
  });

  it('has dir=rtl on the overlay container', () => {
    setupMocks({ pollStatus: 'PROCESSING' });

    render(<PolishingProgressOverlay lessonId="l1" />);

    const overlay = screen.getByTestId('polishing-progress-overlay');
    expect(overlay).toHaveAttribute('dir', 'rtl');
  });
});
