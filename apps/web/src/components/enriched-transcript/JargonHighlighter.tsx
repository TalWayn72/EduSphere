/**
 * JargonHighlighter — splits TEXT block content into plain-text and
 * highlighted segments, wrapping each jargon hit in a JargonTooltip trigger.
 *
 * Preserves RTL text direction for Hebrew content via `dir="auto"`.
 */

import type { ReactNode } from 'react';
import { JargonTooltip } from './JargonTooltip';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JargonHighlight {
  termId: string;
  /** Hebrew canonical form of the term */
  canonicalForm: string;
  /** 2-3 sentence short definition */
  definitionShort: string;
  /** Start character offset (inclusive) in `text` */
  start: number;
  /** End character offset (exclusive) in `text` */
  end: number;
}

interface JargonHighlighterProps {
  text: string;
  highlights?: JargonHighlight[];
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Clamp and de-overlap highlights so they never produce invalid slices. */
function normalise(
  text: string,
  highlights: JargonHighlight[]
): JargonHighlight[] {
  return [...highlights]
    .filter((h) => h.start >= 0 && h.end > h.start && h.end <= text.length)
    .sort((a, b) => a.start - b.start)
    .reduce<JargonHighlight[]>((acc, h) => {
      const prev = acc[acc.length - 1];
      if (prev && h.start < prev.end) return acc; // skip overlapping
      return [...acc, h];
    }, []);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JargonHighlighter({
  text,
  highlights,
  className,
}: JargonHighlighterProps): ReactNode {
  if (!highlights || highlights.length === 0) {
    return (
      <span dir="auto" className={className}>
        {text}
      </span>
    );
  }

  const safe = normalise(text, highlights);
  const segments: ReactNode[] = [];
  let cursor = 0;

  safe.forEach((h, i) => {
    if (cursor < h.start) {
      segments.push(
        <span key={`plain-${i}`}>{text.slice(cursor, h.start)}</span>
      );
    }
    segments.push(
      <JargonTooltip
        key={`jargon-${h.termId}-${i}`}
        termId={h.termId}
        canonicalForm={h.canonicalForm}
        definitionShort={h.definitionShort}
      >
        <mark className="bg-amber-100 dark:bg-amber-900/40 text-foreground rounded px-0.5 cursor-help not-italic">
          {text.slice(h.start, h.end)}
        </mark>
      </JargonTooltip>
    );
    cursor = h.end;
  });

  if (cursor < text.length) {
    segments.push(<span key="plain-tail">{text.slice(cursor)}</span>);
  }

  return (
    <span dir="auto" className={className}>
      {segments}
    </span>
  );
}
