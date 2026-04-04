/**
 * CitationReviewPanel — instructor panel to approve/reject/edit auto-detected citations.
 *
 * Displays a list of citations with their status and allows the instructor
 * to verify, reject, or edit each one.
 */
import { Check, X, Pencil, Filter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CitationCard } from '@/components/enriched-transcript/CitationCard';
import type {
  LessonCitation,
  CitationMatchStatus,
} from '@/components/enriched-transcript/enriched-transcript.types';

interface CitationReviewPanelProps {
  citations: LessonCitation[];
  onApprove: (citationId: string) => void;
  onReject: (citationId: string) => void;
  onEdit: (citationId: string) => void;
  className?: string;
}

type FilterStatus = 'all' | CitationMatchStatus;

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'UNVERIFIED', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EDITED', label: 'Edited' },
];

export function CitationReviewPanel({
  citations,
  onApprove,
  onReject,
  onEdit,
  className = '',
}: CitationReviewPanelProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filtered =
    filter === 'all'
      ? citations
      : citations.filter((c) => c.matchStatus === filter);

  const counts = {
    all: citations.length,
    UNVERIFIED: citations.filter((c) => c.matchStatus === 'UNVERIFIED').length,
    VERIFIED: citations.filter((c) => c.matchStatus === 'VERIFIED').length,
    REJECTED: citations.filter((c) => c.matchStatus === 'REJECTED').length,
    EDITED: citations.filter((c) => c.matchStatus === 'EDITED').length,
  };

  return (
    <div className={`flex flex-col h-full ${className}`} data-testid="citation-review-panel">
      {/* Header + filter */}
      <div className="px-3 py-2 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Citations Review</span>
          <Badge variant="secondary" className="text-xs ms-auto">
            {filtered.length} of {citations.length}
          </Badge>
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => setFilter(opt.value)}
            >
              {opt.label} ({counts[opt.value]})
            </Button>
          ))}
        </div>
      </div>

      {/* Citation list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No citations match the selected filter.
            </p>
          )}
          {filtered.map((citation) => (
            <div key={citation.id} className="space-y-1">
              <CitationCard citation={citation} />
              <div className="flex gap-1 ps-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-emerald-600 dark:text-emerald-400"
                  onClick={() => onApprove(citation.id)}
                  disabled={citation.matchStatus === 'VERIFIED'}
                >
                  <Check className="h-3 w-3 me-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => onReject(citation.id)}
                  disabled={citation.matchStatus === 'REJECTED'}
                >
                  <X className="h-3 w-3 me-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onEdit(citation.id)}
                >
                  <Pencil className="h-3 w-3 me-1" /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
