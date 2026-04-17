/**
 * InlineCitationBlock — student-facing inline citation within transcript flow.
 *
 * Hover over the badge → quick-preview popover (source text, reference, confidence).
 * Click the row → full expand with complete resolved text.
 */
import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LessonCitation } from './enriched-transcript.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a colour class for confidence 0-1. */
function confidenceVariant(confidence: number): string {
  if (confidence >= 0.9) return 'bg-green-100 text-green-800 border-green-200';
  if (confidence >= 0.7)
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function confidenceLabel(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ── Hover-preview sub-component ──────────────────────────────────────────────

interface CitationHoverPreviewProps {
  citation: LessonCitation;
  children: React.ReactNode;
}

function CitationHoverPreview({
  citation,
  children,
}: CitationHoverPreviewProps) {
  const previewText = citation.resolvedText
    ? truncate(citation.resolvedText, 100)
    : citation.sourceText
      ? truncate(citation.sourceText, 100)
      : null;

  const reference = [
    citation.bookName,
    citation.part,
    citation.page ? `p. ${citation.page}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs p-3 space-y-1.5"
          data-testid="citation-hover-preview"
        >
          {/* Source preview text */}
          {previewText && (
            <p
              className="text-xs leading-relaxed italic"
              dir="auto"
              data-testid="hover-preview-text"
            >
              {previewText}
            </p>
          )}

          {/* Book name + page reference */}
          <p
            className="text-xs font-medium"
            data-testid="hover-preview-reference"
          >
            {reference}
          </p>

          {/* Confidence badge */}
          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${confidenceVariant(citation.confidence)}`}
            data-testid="hover-preview-confidence"
          >
            {confidenceLabel(citation.confidence)} match
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface InlineCitationBlockProps {
  citation: LessonCitation;
  transcriptText: string;
  isActive?: boolean;
  onClick?: () => void;
  /** data-block-id for SyncTranscriptScroller scroll-targeting */
  blockId?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function InlineCitationBlock({
  citation,
  transcriptText,
  isActive = false,
  onClick,
  blockId,
}: InlineCitationBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <div
      dir="rtl"
      className={`rounded-md border transition-colors ${
        isActive ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'
      }`}
      data-testid={`inline-citation-${citation.id}`}
      data-block-id={blockId}
    >
      {/* Transcript text with citation indicator */}
      <button
        type="button"
        dir="rtl"
        onClick={() => {
          onClick?.();
          toggle();
        }}
        className="w-full text-right px-3 py-2 flex items-start gap-2"
        aria-expanded={expanded}
      >
        <span className="flex-1 text-sm leading-relaxed" dir="auto">
          {transcriptText}
        </span>

        <span className="shrink-0 flex items-center gap-1 mt-0.5">
          {/* Hover-preview wraps the badge */}
          <CitationHoverPreview citation={citation}>
            <Badge
              variant="outline"
              className="text-xs gap-1 cursor-pointer"
              data-testid="citation-badge"
            >
              <BookOpen className="h-3 w-3" />
              {citation.bookName}
            </Badge>
          </CitationHoverPreview>

          {expanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Expanded source text (full detail on click) */}
      {expanded && (
        <div
          className="px-3 pb-3 pt-1 border-t space-y-1.5"
          data-testid="citation-expanded-panel"
        >
          <p className="text-xs text-muted-foreground italic">
            {citation.bookName}
            {citation.part ? `, ${citation.part}` : ''}
            {citation.page ? `, p. ${citation.page}` : ''}
          </p>
          {citation.resolvedText && (
            <p
              className="text-sm bg-primary/5 rounded px-2 py-1.5 leading-relaxed"
              dir="auto"
            >
              {citation.resolvedText}
            </p>
          )}
          {!citation.resolvedText && (
            <p className="text-xs text-muted-foreground">
              Source text not yet resolved.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
