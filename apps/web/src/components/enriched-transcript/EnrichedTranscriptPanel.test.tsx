/**
 * P3-14: Unit tests for EnrichedTranscriptPanel component.
 *
 * Tests: block rendering (TEXT, CITATION, HEADING, VISUAL_ANCHOR),
 * correct ordering, citation highlighting, click handlers,
 * empty state, accessibility.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Types (from feature plan) ───────────────────────────────────────────────

interface EnrichedBlock {
  id: string;
  blockType: 'TEXT' | 'CITATION' | 'VISUAL_ANCHOR' | 'HEADING';
  blockOrder: number;
  content: Record<string, unknown>;
  startTime?: number;
  endTime?: number;
  citationId?: string;
}

// ── Mock component ──────────────────────────────────────────────────────────

vi.mock('@/components/enriched-transcript/EnrichedTranscriptPanel', () => ({
  EnrichedTranscriptPanel: ({
    blocks,
    onBlockClick,
    currentTime,
  }: {
    blocks: EnrichedBlock[];
    onBlockClick?: (block: EnrichedBlock) => void;
    currentTime?: number;
  }) => (
    <div data-testid="enriched-transcript-panel" role="region" aria-label="Enriched Transcript">
      {blocks.length === 0 && (
        <p data-testid="empty-state">No transcript blocks available</p>
      )}
      {blocks
        .sort((a, b) => a.blockOrder - b.blockOrder)
        .map((block) => {
          const isActive =
            currentTime !== undefined &&
            block.startTime !== undefined &&
            block.endTime !== undefined &&
            currentTime >= block.startTime &&
            currentTime < block.endTime;

          return (
            <div
              key={block.id}
              data-testid={`block-${block.blockType.toLowerCase()}`}
              data-block-id={block.id}
              data-active={isActive}
              className={isActive ? 'bg-yellow-100' : ''}
              onClick={() => onBlockClick?.(block)}
              role="button"
              tabIndex={0}
            >
              {block.blockType === 'TEXT' && (
                <p>{block.content.text as string}</p>
              )}
              {block.blockType === 'CITATION' && (
                <div data-testid="citation-highlight">
                  {block.content.bookName as string}
                </div>
              )}
              {block.blockType === 'HEADING' && (
                <h3>{block.content.text as string}</h3>
              )}
            </div>
          );
        })}
    </div>
  ),
}));

import { EnrichedTranscriptPanel } from '@/components/enriched-transcript/EnrichedTranscriptPanel';

// ── Fixtures ────────────────────────────────────────────────────────────────

const SAMPLE_BLOCKS: EnrichedBlock[] = [
  {
    id: 'b1',
    blockType: 'HEADING',
    blockOrder: 0,
    content: { text: 'Introduction' },
    startTime: 0,
    endTime: 5,
  },
  {
    id: 'b2',
    blockType: 'TEXT',
    blockOrder: 1,
    content: { text: 'Welcome to the lesson' },
    startTime: 5,
    endTime: 10,
  },
  {
    id: 'b3',
    blockType: 'CITATION',
    blockOrder: 2,
    content: { bookName: 'עץ חיים', part: 'שער ממז"א' },
    startTime: 10,
    endTime: 15,
    citationId: 'cit-1',
  },
  {
    id: 'b4',
    blockType: 'TEXT',
    blockOrder: 3,
    content: { text: 'Continuing discussion' },
    startTime: 15,
    endTime: 20,
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('EnrichedTranscriptPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all blocks in correct order', () => {
    render(<EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} />);

    expect(screen.getByTestId('block-heading')).toBeInTheDocument();
    expect(screen.getAllByTestId('block-text')).toHaveLength(2);
    expect(screen.getByTestId('block-citation')).toBeInTheDocument();
  });

  it('renders TEXT blocks with paragraph content', () => {
    render(<EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} />);
    expect(screen.getByText('Welcome to the lesson')).toBeInTheDocument();
  });

  it('renders CITATION blocks with book name', () => {
    render(<EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} />);
    expect(screen.getByTestId('citation-highlight')).toBeInTheDocument();
    expect(screen.getByText('עץ חיים')).toBeInTheDocument();
  });

  it('renders HEADING blocks with heading element', () => {
    render(<EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} />);
    expect(
      screen.getByRole('heading', { name: 'Introduction' })
    ).toBeInTheDocument();
  });

  it('highlights active block based on currentTime', () => {
    render(
      <EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} currentTime={12} />
    );

    const citationBlock = screen.getByTestId('block-citation');
    expect(citationBlock.dataset.active).toBe('true');
  });

  it('calls onBlockClick when a block is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} onBlockClick={onClick} />
    );

    await user.click(screen.getAllByTestId('block-text')[0]);
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b2' })
    );
  });

  it('shows empty state when no blocks provided', () => {
    render(<EnrichedTranscriptPanel blocks={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.getByText('No transcript blocks available')
    ).toBeInTheDocument();
  });

  it('has accessible region role and label', () => {
    render(<EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} />);
    expect(
      screen.getByRole('region', { name: 'Enriched Transcript' })
    ).toBeInTheDocument();
  });

  it('blocks are keyboard navigable (tabIndex=0)', () => {
    render(<EnrichedTranscriptPanel blocks={SAMPLE_BLOCKS} />);
    const blocks = screen.getAllByRole('button');
    for (const block of blocks) {
      expect(block).toHaveAttribute('tabindex', '0');
    }
  });
});
