/**
 * CitationRow — single citation entry in SourceLinkingPanel.
 * Shows book name, reference details, match_status badge, and action buttons.
 */
import { Link2, Upload, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  LessonCitation,
  CitationMatchStatus,
} from '@/components/enriched-transcript/enriched-transcript.types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KnowledgeSource {
  id: string;
  title: string;
  sourceType: string;
  status: string;
}

interface CitationRowProps {
  citation: LessonCitation;
  sources: KnowledgeSource[];
  onUploadRequest: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusVariant(
  status: CitationMatchStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'VERIFIED':
      return 'default';
    case 'UNVERIFIED':
      return 'secondary';
    case 'REJECTED':
      return 'destructive';
    case 'EDITED':
      return 'outline';
    default:
      return 'secondary';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CitationRow({
  citation,
  sources,
  onUploadRequest,
}: CitationRowProps) {
  const readySources = sources.filter((s) => s.status === 'READY');

  return (
    <div
      className="flex flex-col gap-1.5 border rounded-lg px-3 py-2.5"
      data-testid={`citation-row-${citation.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate" dir="auto">
          {citation.bookName}
        </span>
        <Badge
          variant={statusVariant(citation.matchStatus)}
          className="text-xs shrink-0"
        >
          {citation.matchStatus}
        </Badge>
      </div>

      {(citation.part || citation.page) && (
        <p className="text-xs text-muted-foreground">
          {[citation.part, citation.page ? `p. ${citation.page}` : null]
            .filter(Boolean)
            .join(', ')}
        </p>
      )}

      <div className="flex gap-2 mt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Link2 className="h-3 w-3" />
              Link Source
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-w-[260px]">
            {readySources.length === 0 ? (
              <DropdownMenuItem disabled>No sources available</DropdownMenuItem>
            ) : (
              readySources.map((src) => (
                <DropdownMenuItem key={src.id} className="text-xs">
                  {src.title}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onUploadRequest}
        >
          <Upload className="h-3 w-3" />
          Upload Source
        </Button>
      </div>
    </div>
  );
}
