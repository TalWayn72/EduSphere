/**
 * Unit tests for PolishedTranscriptPanel — student reading view.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PolishedTranscriptPanel } from './PolishedTranscriptPanel';
import type { PolishedBlock } from './polished-transcript-reader.types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
  ),
}));

// jsdom does not implement scrollIntoView — stub it globally.
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const textBlock: PolishedBlock = {
  id: 'b1',
  blockType: 'POLISHED_TEXT',
  text: 'This is a polished paragraph.',
  startTime: 5,
  endTime: 20,
};

const headingBlock: PolishedBlock = {
  id: 'b2',
  blockType: 'POLISHED_HEADING',
  text: 'Section Title',
  startTime: null,
  endTime: null,
};

const citationBlock: PolishedBlock = {
  id: 'b3',
  blockType: 'POLISHED_CITATION',
  text: 'As it says in the Talmud...',
  startTime: 25,
  endTime: 35,
};

const noTimestampBlock: PolishedBlock = {
  id: 'b4',
  blockType: 'POLISHED_TEXT',
  text: 'A block without a timestamp.',
  startTime: null,
  endTime: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PolishedTranscriptPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the panel wrapper with correct testid', () => {
    render(<PolishedTranscriptPanel blocks={[]} />);
    expect(screen.getByTestId('polished-transcript-panel')).toBeDefined();
  });

  it('renders empty state when blocks is empty', () => {
    render(<PolishedTranscriptPanel blocks={[]} />);
    expect(screen.getByText('אין תוכן זמין')).toBeDefined();
  });

  it('renders POLISHED_TEXT block as a button', () => {
    render(<PolishedTranscriptPanel blocks={[textBlock]} />);
    const btn = screen.getByRole('button', { name: textBlock.text });
    expect(btn).toBeDefined();
    expect(btn.getAttribute('data-block-id')).toBe('b1');
  });

  it('renders POLISHED_HEADING block as an h3', () => {
    render(<PolishedTranscriptPanel blocks={[headingBlock]} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).toBe('Section Title');
    expect(heading.getAttribute('data-block-id')).toBe('b2');
  });

  it('renders POLISHED_CITATION block as a blockquote', () => {
    render(<PolishedTranscriptPanel blocks={[citationBlock]} />);
    const quote = document.querySelector('blockquote');
    expect(quote).not.toBeNull();
    expect(quote!.textContent).toBe('As it says in the Talmud...');
    expect(quote!.getAttribute('data-block-id')).toBe('b3');
  });

  it('active TEXT block gets bg-primary/10 class when currentTime is in range', () => {
    render(<PolishedTranscriptPanel blocks={[textBlock]} currentTime={10} />);
    const btn = screen.getByRole('button', { name: textBlock.text });
    expect(btn.className).toContain('bg-primary/10');
  });

  it('inactive TEXT block does not get bg-primary/10 when currentTime is out of range', () => {
    render(<PolishedTranscriptPanel blocks={[textBlock]} currentTime={30} />);
    const btn = screen.getByRole('button', { name: textBlock.text });
    expect(btn.className).not.toContain('bg-primary/10');
  });

  it('click on TEXT block calls onSeek with block startTime', () => {
    const onSeek = vi.fn();
    render(<PolishedTranscriptPanel blocks={[textBlock]} onSeek={onSeek} />);
    fireEvent.click(screen.getByRole('button', { name: textBlock.text }));
    expect(onSeek).toHaveBeenCalledWith(5);
  });

  it('click on TEXT block without startTime does not call onSeek', () => {
    const onSeek = vi.fn();
    render(
      <PolishedTranscriptPanel blocks={[noTimestampBlock]} onSeek={onSeek} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: noTimestampBlock.text })
    );
    expect(onSeek).not.toHaveBeenCalled();
  });
});
