/**
 * InlineCitationBlock — student-facing inline citation within transcript flow.
 *
 * Shows the transcript text with a citation indicator that expands
 * to reveal the source text and reference on click.
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

interface InlineCitationBlockProps {
  citation: LessonCitation;
  transcriptText: string;
  isActive?: boolean;
  onClick?: () => void;
  /** data-block-id for SyncTranscriptScroller scroll-targeting */
  blockId?: string;
}

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
      className={`rounded-md border transition-colors ${
        isActive ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'
      }`}
      data-testid={`inline-citation-${citation.id}`}
      data-block-id={blockId}
    >
      {/* Transcript text with citation indicator */}
      <button
        type="button"
        onClick={() => {
          onClick?.();
          toggle();
        }}
        className="w-full text-start px-3 py-2 flex items-start gap-2"
        aria-expanded={expanded}
      >
        <span className="flex-1 text-sm leading-relaxed" dir="auto">
          {transcriptText}
        </span>
        <span className="shrink-0 flex items-center gap-1 mt-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs gap-1 cursor-pointer"
                >
                  <BookOpen className="h-3 w-3" />
                  {citation.bookName}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium text-xs">{citation.bookName}</p>
                {citation.part && (
                  <p className="text-xs text-muted-foreground">
                    {citation.part}
                  </p>
                )}
                {citation.page && (
                  <p className="text-xs text-muted-foreground">
                    p. {citation.page}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      </button>

      {/* Expanded source text */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-1.5">
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
