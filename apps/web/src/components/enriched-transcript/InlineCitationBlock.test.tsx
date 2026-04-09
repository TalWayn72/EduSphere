/**
 * Unit tests for InlineCitationBlock component.
 *
 * Tests: rendering, active state styling, expand/collapse,
 * onClick callback, data-block-id scroll-targeting attribute.
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
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid="badge" className={className}>
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
    expect(screen.getByTestId('badge')).toHaveTextContent('עץ חיים');
  });

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

  it('resolved text is NOT visible before expanding', () => {
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );
    expect(
      screen.queryByText('וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר')
    ).not.toBeInTheDocument();
  });

  it('shows resolved text after clicking to expand', async () => {
    const user = userEvent.setup();
    render(
      <InlineCitationBlock
        citation={MOCK_CITATION}
        transcriptText={TRANSCRIPT_TEXT}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(
      screen.getByText('וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר')
    ).toBeInTheDocument();
  });

  it('collapses resolved text on second click', async () => {
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
      screen.queryByText('וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר')
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
});
