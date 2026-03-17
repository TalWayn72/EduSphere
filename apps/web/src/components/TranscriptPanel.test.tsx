import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TranscriptPanel } from './TranscriptPanel';
import type { TranscriptSegment } from '@/lib/mock-content-data';

// scrollIntoView is not implemented in jsdom — stub it globally
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SEGMENTS: TranscriptSegment[] = [
  {
    id: 'seg-1',
    startTime: 0,
    endTime: 10,
    text: 'Welcome to the Talmud course',
  },
  {
    id: 'seg-2',
    startTime: 10,
    endTime: 20,
    text: 'Today we will discuss the Mishna',
  },
  { id: 'seg-3', startTime: 20, endTime: 30, text: 'Advanced halacha topics' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TranscriptPanel', () => {
  it('renders all transcript segments', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    expect(
      screen.getByText('Welcome to the Talmud course')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Today we will discuss the Mishna')
    ).toBeInTheDocument();
    expect(screen.getByText('Advanced halacha topics')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    // Placeholder text comes from t('searchTranscript')
    expect(
      screen.getByPlaceholderText('Search transcript, annotations...')
    ).toBeInTheDocument();
  });

  it('filters segments by search query', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Mishna' } });

    expect(
      screen.getByText('Today we will discuss the Mishna')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Welcome to the Talmud course')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Advanced halacha topics')
    ).not.toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'talmud' } });
    expect(
      screen.getByText('Welcome to the Talmud course')
    ).toBeInTheDocument();
  });

  it('shows "No results found" when search yields no matches', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'xyz-no-match' } });
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('formats timestamps as M:SS', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    // startTime=0 → "0:00", startTime=10 → "0:10", startTime=20 → "0:20"
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('0:10')).toBeInTheDocument();
    expect(screen.getByText('0:20')).toBeInTheDocument();
  });

  it('calls onSeek with the segment startTime when a segment is clicked', () => {
    const onSeek = vi.fn();
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={onSeek}
      />
    );
    fireEvent.click(screen.getByText('Today we will discuss the Mishna'));
    expect(onSeek).toHaveBeenCalledWith(10);
  });

  it('renders empty state when no segments are provided', () => {
    render(<TranscriptPanel segments={[]} currentTime={0} onSeek={vi.fn()} />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('does not show "No results found" when there are matching segments', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });

  it('highlights the active segment based on currentTime', () => {
    const { container } = render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={15}
        onSeek={vi.fn()}
      />
    );
    // Segment 2 (10-20) should be active and have the primary border class
    const activeEl = container.querySelector('.border-primary');
    expect(activeEl).toBeInTheDocument();
    expect(activeEl?.textContent).toContain(
      'Today we will discuss the Mishna'
    );
  });

  it('does not show raw i18n keys in the output', () => {
    render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    const html = document.body.innerHTML;
    // i18n keys look like content.searchTranscript — should be translated
    expect(html).not.toContain('searchTranscript');
    expect(html).not.toContain('transcriptNoResults');
  });

  it('calls scrollIntoView when active segment changes', () => {
    const scrollSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollSpy;

    const { rerender } = render(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={5}
        onSeek={vi.fn()}
      />
    );

    rerender(
      <TranscriptPanel
        segments={MOCK_SEGMENTS}
        currentTime={15}
        onSeek={vi.fn()}
      />
    );

    expect(scrollSpy).toHaveBeenCalled();
  });
});
