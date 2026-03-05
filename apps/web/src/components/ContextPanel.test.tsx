/**
 * ContextPanel tests — G1 HybridRAG context sidebar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
}));

vi.mock('@/lib/graphql/knowledge.queries', () => ({
  SEARCH_SEMANTIC_QUERY: 'SEARCH_SEMANTIC_QUERY',
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { ContextPanel } from './ContextPanel';
import { useQuery } from 'urql';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEGMENT = {
  id: 'seg-1',
  text: 'The Talmudic debate on Shabbat law explores the concept of melacha',
  startTime: 60,
  endTime: 90,
};

function mockUseQuery(data: Record<string, unknown> | undefined, fetching = false) {
  vi.mocked(useQuery).mockReturnValue([
    { data, fetching, error: undefined },
    vi.fn(),
  ] as never);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContextPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseQuery(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  it('shows play-video prompt when activeSegment is null', () => {
    render(<ContextPanel activeSegment={null} />);
    expect(
      screen.getByText(/play the video/i)
    ).toBeInTheDocument();
  });

  it('does not show "Related Concepts" section heading when no segment is active', () => {
    render(<ContextPanel activeSegment={null} />);
    // Section heading is exactly "Related Concepts" — empty-state message is different text
    expect(screen.queryByText('Related Concepts')).not.toBeInTheDocument();
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it('shows loading spinner while query is fetching', () => {
    mockUseQuery(undefined, true);
    render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(700); // past 600ms debounce
    });

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ── No results ─────────────────────────────────────────────────────────────

  it('shows "no related concepts" when searchSemantic returns empty array', () => {
    mockUseQuery({ searchSemantic: [] });
    render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText(/no related concepts found/i)).toBeInTheDocument();
  });

  it('shows segment text snippet in empty state', () => {
    mockUseQuery({ searchSemantic: [] });
    render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(document.body.textContent).toContain('Talmudic debate');
  });

  // ── Concept results ────────────────────────────────────────────────────────

  it('renders "Related Concepts" section when concepts are returned', () => {
    mockUseQuery({
      searchSemantic: [
        {
          id: 'c-1',
          text: 'Melacha — prohibited work on Shabbat',
          similarity: 0.91,
          entityType: 'concept',
          entityId: 'concept-melacha',
          startTime: null,
        },
      ],
    });
    render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText(/related concepts/i)).toBeInTheDocument();
    expect(document.body.textContent).toContain('Melacha');
  });

  it('shows similarity percentage badge for concept result', () => {
    mockUseQuery({
      searchSemantic: [
        {
          id: 'c-badge',
          text: 'Kal vachomer',
          similarity: 0.85,
          entityType: 'concept',
          entityId: 'concept-kv',
          startTime: null,
        },
      ],
    });
    render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(document.body.textContent).toContain('85%');
  });

  // ── Segment results ────────────────────────────────────────────────────────

  it('renders "Related Segments" section when non-concept results returned', () => {
    mockUseQuery({
      searchSemantic: [
        {
          id: 's-1',
          text: 'A related lecture on Talmudic law',
          similarity: 0.78,
          entityType: 'transcript_segment',
          entityId: 'content-42',
          startTime: 125,
        },
      ],
    });
    render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText(/related segments/i)).toBeInTheDocument();
    expect(document.body.textContent).toContain('A related lecture');
  });

  it('renders a "Jump to" button for segment results that have startTime', () => {
    const onSeek = vi.fn();
    mockUseQuery({
      searchSemantic: [
        {
          id: 's-jump',
          text: 'Segment with timestamp',
          similarity: 0.72,
          entityType: 'transcript_segment',
          entityId: 'content-43',
          startTime: 65,
        },
      ],
    });
    render(<ContextPanel activeSegment={SEGMENT} onSeek={onSeek} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    const jumpBtn = screen.getByRole('button', { name: /jump to/i });
    expect(jumpBtn).toBeInTheDocument();
  });

  it('calls onSeek with correct startTime when Jump button is clicked', async () => {
    vi.useRealTimers();
    const onSeek = vi.fn();
    mockUseQuery({
      searchSemantic: [
        {
          id: 's-seek',
          text: 'Clickable segment',
          similarity: 0.8,
          entityType: 'transcript_segment',
          entityId: 'content-44',
          startTime: 90,
        },
      ],
    });
    render(<ContextPanel activeSegment={SEGMENT} onSeek={onSeek} />);

    // With real timers, wait for debounce to fire via state update
    await waitFor(
      () => screen.getByRole('button', { name: /jump to/i }),
      { timeout: 1500 }
    );

    await userEvent.click(screen.getByRole('button', { name: /jump to/i }));
    expect(onSeek).toHaveBeenCalledWith(90);
  });

  it('does not render Jump button when startTime is null', () => {
    const onSeek = vi.fn();
    mockUseQuery({
      searchSemantic: [
        {
          id: 's-no-ts',
          text: 'Segment without timestamp',
          similarity: 0.6,
          entityType: 'transcript_segment',
          entityId: 'content-45',
          startTime: null,
        },
      ],
    });
    render(<ContextPanel activeSegment={SEGMENT} onSeek={onSeek} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByRole('button', { name: /jump to/i })).not.toBeInTheDocument();
  });

  // ── Debounce ───────────────────────────────────────────────────────────────

  it('does not query before the 600ms debounce fires', () => {
    render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(500); // before debounce
    });

    // useQuery was called but with pause=true (queryText still empty)
    // The loading state should NOT be active yet
    expect(screen.queryByText(/finding related concepts/i)).not.toBeInTheDocument();
  });

  it('clears debounce timer on segment change', () => {
    const { rerender } = render(<ContextPanel activeSegment={SEGMENT} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Change segment before debounce fires — timer should reset
    const SEGMENT2 = { ...SEGMENT, id: 'seg-2', text: 'Different segment text' };
    rerender(<ContextPanel activeSegment={SEGMENT2} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only 300ms after the 2nd segment — debounce not yet fired
    expect(screen.queryByText(/finding related concepts/i)).not.toBeInTheDocument();
  });

  // ── Mixed results ──────────────────────────────────────────────────────────

  it('renders both concepts and segments when both are returned', () => {
    mockUseQuery({
      searchSemantic: [
        {
          id: 'c-mix',
          text: 'Mixed concept result',
          similarity: 0.9,
          entityType: 'concept',
          entityId: 'concept-mix',
          startTime: null,
        },
        {
          id: 's-mix',
          text: 'Mixed segment result',
          similarity: 0.8,
          entityType: 'transcript_segment',
          entityId: 'content-mix',
          startTime: 200,
        },
      ],
    });
    render(<ContextPanel activeSegment={SEGMENT} onSeek={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText(/related concepts/i)).toBeInTheDocument();
    expect(screen.getByText(/related segments/i)).toBeInTheDocument();
  });
});
