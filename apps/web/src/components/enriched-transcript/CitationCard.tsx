/**
 * CitationCard — expandable card showing source text + metadata.
 *
 * Displays a collapsed summary (book name + confidence badge) that
 * expands to reveal resolved source text and full reference details.
 */
import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LessonCitation } from './enriched-transcript.types';

interface CitationCardProps {
  citation: LessonCitation;
  className?: string;
  defaultExpanded?: boolean;
  onExpand?: (citationId: string) => void;
}

function formatReference(c: LessonCitation): string {
  const parts: string[] = [c.bookName];
  if (c.part) parts.push(c.part);
  if (c.page) parts.push(`p. ${c.page}`);
  if (c.column) parts.push(`col. ${c.column}`);
  if (c.paragraph) parts.push(`par. ${c.paragraph}`);
  return parts.join(', ');
}

export function CitationCard({
  citation,
  className = '',
  defaultExpanded = false,
  onExpand,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isVerified = citation.matchStatus === 'VERIFIED';

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) onExpand?.(citation.id);
  };

  return (
    <Card
      className={`border-s-4 ${isVerified ? 'border-s-emerald-500' : 'border-s-amber-500'} ${className}`}
      data-testid={`citation-card-${citation.id}`}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              className="w-full flex items-center gap-2 px-3 py-2 text-start"
              aria-expanded={expanded}
              aria-label={`Citation: ${citation.bookName}`}
            >
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium truncate">
                {citation.bookName}
              </span>
              <Badge
                variant={isVerified ? 'default' : 'secondary'}
                className="text-xs"
              >
                {isVerified ? (
                  <CheckCircle className="h-3 w-3 me-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 me-1" />
                )}
                {Math.round(citation.confidence * 100)}%
              </Badge>
              {expanded ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium text-xs">{formatReference(citation)}</p>
            {citation.sourceText && (
              <p
                className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                dir="auto"
              >
                {citation.sourceText}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t pt-2">
          {/* Reference line */}
          <p className="text-xs text-muted-foreground italic">
            {formatReference(citation)}
          </p>

          {/* Original mention in transcript */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Mentioned Text
            </p>
            <p className="text-sm bg-muted/50 rounded px-2 py-1" dir="auto">
              {citation.sourceText}
            </p>
          </div>

          {/* Resolved source text (if available) */}
          {citation.resolvedText && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Source Text
              </p>
              <p
                className="text-sm bg-primary/5 rounded px-2 py-1 leading-relaxed"
                dir="auto"
              >
                {citation.resolvedText}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
