/**
 * Unit tests for SyncTranscriptScroller component.
 *
 * Tests: auto-scroll to active block, user-scroll pause,
 * click-to-seek, onCitationExpand forwarding,
 * autoScroll=false disables scrollIntoView.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Types ────────────────────────────────────────────────────────────────────

import type { EnrichedTranscriptBlock } from './enriched-transcript.types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./EnrichedTranscriptPanel', () => ({
  EnrichedTranscriptPanel: ({
    blocks,
    currentTime,
    onBlockClick,
    onCitationExpand,
  }: {
    blocks: EnrichedTranscriptBlock[];
    currentTime?: number;
    onBlockClick?: (block: EnrichedTranscriptBlock) => void;
    onCitationExpand?: (id: string) => void;
  }) => (
    <div data-testid="enriched-transcript-panel">
      {blocks.map((block) => (
        <div
          key={block.id}
          data-block-id={block.id}
          data-testid={`block-${block.id}`}
          data-active={
            currentTime != null &&
            block.startTime != null &&
            currentTime >= block.startTime
              ? 'true'
              : 'false'
          }
          onClick={() => onBlockClick?.(block)}
          role="button"
          tabIndex={0}
        >
          {String(block.content['text'] ?? block.id)}
          {onCitationExpand && block.blockType === 'CITATION' && (
            <button
              data-testid={`expand-${block.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onCitationExpand(block.id);
              }}
            >
              expand
            </button>
          )}
        </div>
      ))}
    </div>
  ),
}));

// ── Component import ──────────────────────────────────────────────────────────

import { SyncTranscriptScroller } from './SyncTranscriptScroller';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeBlock = (
  id: string,
  startTime: number,
  text = id
): EnrichedTranscriptBlock => ({
  id,
  lessonId: 'lesson-1',
  blockType: 'TEXT',
  blockOrder: 0,
  content: { text },
  startTime,
  endTime: startTime + 5,
});

const BLOCKS: EnrichedTranscriptBlock[] = [
  makeBlock('b1', 0, 'First segment'),
  makeBlock('b2', 5, 'Second segment'),
  makeBlock('b3', 10, 'Third segment'),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SyncTranscriptScroller', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    scrollIntoViewMock = vi.fn();
    // Attach scrollIntoView mock to all elements via prototype
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders EnrichedTranscriptPanel with provided blocks', () => {
    render(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );
    expect(screen.getByTestId('enriched-transcript-panel')).toBeInTheDocument();
    expect(screen.getByTestId('block-b1')).toBeInTheDocument();
    expect(screen.getByTestId('block-b2')).toBeInTheDocument();
    expect(screen.getByTestId('block-b3')).toBeInTheDocument();
  });

  it('calls scrollIntoView when active block changes', () => {
    const { rerender } = render(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );

    // Advance time so b2 becomes active
    rerender(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={6}
        onSeek={vi.fn()}
      />
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('does NOT call scrollIntoView again for the same active block', () => {
    const { rerender } = render(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={5}
        onSeek={vi.fn()}
      />
    );

    const callCount = scrollIntoViewMock.mock.calls.length;

    // currentTime still within b2 range
    rerender(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={7}
        onSeek={vi.fn()}
      />
    );

    expect(scrollIntoViewMock.mock.calls.length).toBe(callCount);
  });

  it('does NOT scroll when autoScroll=false', () => {
    const { rerender } = render(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={0}
        onSeek={vi.fn()}
        autoScroll={false}
      />
    );

    rerender(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={6}
        onSeek={vi.fn()}
        autoScroll={false}
      />
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('calls onSeek with block startTime when a block is clicked', () => {
    const onSeek = vi.fn();

    render(
      <SyncTranscriptScroller blocks={BLOCKS} currentTime={0} onSeek={onSeek} />
    );

    fireEvent.click(screen.getByTestId('block-b2'));
    expect(onSeek).toHaveBeenCalledWith(5);
  });

  it('pauses auto-scroll after user wheel event', () => {
    const { rerender } = render(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={0}
        onSeek={vi.fn()}
      />
    );

    // Simulate user scroll
    fireEvent.wheel(
      screen.getByTestId('enriched-transcript-panel').parentElement!
    );

    // Clear mock so we only track calls that happen AFTER the wheel event
    scrollIntoViewMock.mockClear();

    // Advance to b2 — auto-scroll should be suppressed while userScrolled=true
    rerender(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={6}
        onSeek={vi.fn()}
      />
    );

    // scrollIntoView should NOT be called while user is scrolling
    expect(scrollIntoViewMock).not.toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });

    // Flush the 3-second cooldown so the timer is cleaned up before next test
    act(() => {
      vi.runAllTimers();
    });
  });

  it('forwards onCitationExpand to EnrichedTranscriptPanel', () => {
    const onCitationExpand = vi.fn();

    const citationBlock: EnrichedTranscriptBlock = {
      id: 'cit-1',
      lessonId: 'lesson-1',
      blockType: 'CITATION',
      blockOrder: 3,
      content: { text: 'citation text' },
      startTime: 15,
      endTime: 20,
    };

    render(
      <SyncTranscriptScroller
        blocks={[...BLOCKS, citationBlock]}
        currentTime={0}
        onSeek={vi.fn()}
        onCitationExpand={onCitationExpand}
      />
    );

    fireEvent.click(screen.getByTestId('expand-cit-1'));
    expect(onCitationExpand).toHaveBeenCalledWith('cit-1');
  });

  it('applies provided className to the root div', () => {
    const { container } = render(
      <SyncTranscriptScroller
        blocks={BLOCKS}
        currentTime={0}
        onSeek={vi.fn()}
        className="h-full custom-class"
      />
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('custom-class');
  });

  it('renders empty panel when blocks array is empty', () => {
    render(
      <SyncTranscriptScroller blocks={[]} currentTime={0} onSeek={vi.fn()} />
    );
    expect(screen.getByTestId('enriched-transcript-panel')).toBeInTheDocument();
  });
});
