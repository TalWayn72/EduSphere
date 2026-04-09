/**
 * Unit tests for InlineCitationBlock component.
 *
 * Tests: rendering, active state styling, expand/collapse,
 * onClick callback, data-block-id scroll-targeting attribute,
 * hover popover preview content.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipTrigger: ({
    children,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
  TooltipContent: ({
    children,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    'data-testid'?: string;
  }) => <div data-testid={testId ?? 'tooltip-content'}>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    className?: string;
    'data-testid'?: string;
  }) => (
    <span data-testid={testId ?? 'badge'} className={className}>
      {children}
    </span>
  ),
}));

// ── Component import (after mocks) ───────────────────────────────────────────

import { InlineCitationBlock } from './InlineCitationBlock';
import type { LessonCitation } from './enriched-transcript.types';
import React from 'react';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CITATION: LessonCitation = {
  id: 'cit-001',
  sourceText: 'מקור ראשוני',
  bookName: 'עץ חיים',
  part: 'שער א',
  page: '12',
  matchStatus: 'UNVERIFIED',
  confidence: 0.87,
  resolvedText: 'וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר',
};

const TRANSCRIPT_TEXT = 'ויאמר אלוהים יהי אור';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InlineCitationBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the transcript text', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    expect(screen.getByText(TRANSCRIPT_TEXT)).toBeInTheDocument();
  });

  it('renders the book name badge', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    expect(screen.getByTestId('citation-badge')).toHaveTextContent('עץ חיים');
  });

  // ── Active state ───────────────────────────────────────────────────────────

  it('applies active styling when isActive=true', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
        isActive={true}
      />
    );
    const root = screen.getByTestId('inline-citation-cit-001');
    expect(root.className).toContain('bg-primary/10');
    expect(root.className).toContain('border-primary/30');
  });

  it('does NOT apply active styling when isActive=false', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
        isActive={false}
      />
    );
    const root = screen.getByTestId('inline-citation-cit-001');
    expect(root.className).not.toContain('bg-primary/10');
    expect(root.className).toContain('bg-card');
  });

  it('does NOT apply active styling by default (isActive defaults to false)', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const root = screen.getByTestId('inline-citation-cit-001');
    expect(root.className).not.toContain('bg-primary/10');
  });

  // ── Click-to-expand ────────────────────────────────────────────────────────

  it('expanded details panel is NOT visible before expanding', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    // The hover popover may show the resolved text; check the expanded *panel* is absent
    expect(
      screen.queryByTestId('citation-expanded-panel')
    ).not.toBeInTheDocument();
  });

  it('shows resolved text in expanded panel after clicking to expand', async () => {
    const user = userEvent.setup();
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(screen.getByTestId('citation-expanded-panel')).toBeInTheDocument();
    expect(screen.getByTestId('citation-expanded-panel')).toHaveTextContent(
      'וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר'
    );
  });

  it('collapses expanded panel on second click', async () => {
    const user = userEvent.setup();
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );

    const btn = screen.getByRole('button');
    await user.click(btn);
    await user.click(btn);
    expect(
      screen.queryByTestId('citation-expanded-panel')
    ).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
        onClick={onClick}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows "Source text not yet resolved" when resolvedText is absent', async () => {
    const user = userEvent.setup();
    const citationNoResolved: LessonCitation = {
      ...MOCK_CITATION,
      resolvedText: undefined,
    };
    render(
      <InlineCitationBlock
        citation={citationNoResolved}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(
      screen.getByText('Source text not yet resolved.')
    ).toBeInTheDocument();
  });

  // ── data-block-id ──────────────────────────────────────────────────────────

  it('renders data-block-id when blockId is provided', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
        blockId="block-42"
      />
    );
    const root = screen.getByTestId('inline-citation-cit-001');
    expect(root).toHaveAttribute('data-block-id', 'block-42');
  });

  it('does NOT render data-block-id when blockId is undefined', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const root = screen.getByTestId('inline-citation-cit-001');
    expect(root).not.toHaveAttribute('data-block-id');
  });

  // ── aria-expanded ──────────────────────────────────────────────────────────

  it('button has aria-expanded=false initially', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('button has aria-expanded=true after expanding', async () => {
    const user = userEvent.setup();
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  // ── Hover popover preview ──────────────────────────────────────────────────

  it('renders hover preview container in DOM', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    expect(screen.getByTestId('citation-hover-preview')).toBeInTheDocument();
  });

  it('hover preview shows resolved text truncated to 100 chars', () => {
    const longText = 'א'.repeat(120);
    render(
      <InlineCitationBlock
        citation={{ ...MOCK_CITATION, resolvedText: longText }}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const previewText = screen.getByTestId('hover-preview-text');
    expect(previewText.textContent).toHaveLength(101); // 100 chars + '…' (1 UTF char)
    expect(previewText.textContent?.endsWith('…')).toBe(true);
  });

  it('hover preview shows book name and page reference', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const ref = screen.getByTestId('hover-preview-reference');
    expect(ref.textContent).toContain('עץ חיים');
    expect(ref.textContent).toContain('שער א');
    expect(ref.textContent).toContain('p. 12');
  });

  it('hover preview shows confidence badge percentage', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const conf = screen.getByTestId('hover-preview-confidence');
    expect(conf.textContent).toContain('87%');
    expect(conf.textContent).toContain('match');
  });

  it('hover preview falls back to sourceText when resolvedText is absent', () => {
    const citationNoResolved: LessonCitation = {
      ...MOCK_CITATION,
      resolvedText: undefined,
      sourceText: 'טקסט מקורי',
    };
    render(
      <InlineCitationBlock
        citation={citationNoResolved}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const previewText = screen.getByTestId('hover-preview-text');
    expect(previewText.textContent).toContain('טקסט מקורי');
  });

  it('hover preview omits preview text when both resolvedText and sourceText are absent', () => {
    const citationNoText: LessonCitation = {
      ...MOCK_CITATION,
      resolvedText: undefined,
      sourceText: '',
    };
    render(
      <InlineCitationBlock
        citation={citationNoText}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    expect(screen.queryByTestId('hover-preview-text')).not.toBeInTheDocument();
  });

  it('confidence badge uses green class for confidence >= 0.9', () => {
    render(
      <InlineCitationBlock
        citation={{ ...MOCK_CITATION, confidence: 0.95 }}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const conf = screen.getByTestId('hover-preview-confidence');
    expect(conf.className).toContain('bg-green-100');
  });

  it('confidence badge uses yellow class for confidence in [0.7, 0.9)', () => {
    render(
      <InlineCitationBlock
        citation={{ ...MOCK_CITATION, confidence: 0.75 }}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const conf = screen.getByTestId('hover-preview-confidence');
    expect(conf.className).toContain('bg-yellow-100');
  });

  it('confidence badge uses red class for confidence < 0.7', () => {
    render(
      <InlineCitationBlock
        citation={{ ...MOCK_CITATION, confidence: 0.5 }}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const conf = screen.getByTestId('hover-preview-confidence');
    expect(conf.className).toContain('bg-red-100');
  });

  it('hover preview reference omits page when page is null', () => {
    render(
      <InlineCitationBlock
        citation={{ ...MOCK_CITATION, page: null }}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const ref = screen.getByTestId('hover-preview-reference');
    expect(ref.textContent).not.toContain('p.');
  });

  it('hover preview reference omits part when part is null', () => {
    render(
      <InlineCitationBlock
        citation={{ ...MOCK_CITATION, part: null }}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    const ref = screen.getByTestId('hover-preview-reference');
    expect(ref.textContent).not.toContain('שער א');
    expect(ref.textContent).toContain('עץ חיים');
  });
});
