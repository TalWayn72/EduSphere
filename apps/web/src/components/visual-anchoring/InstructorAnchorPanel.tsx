/**
 * InstructorAnchorPanel — right sidebar listing all visual anchors
 * for the instructor to review, manage, and delete.
 */
import React, { useCallback } from 'react';
import { useMutation } from 'urql';
import { Trash2, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DELETE_VISUAL_ANCHOR } from './visual-anchor.graphql';
import type { VisualAnchor } from './visual-anchor.types';

interface InstructorAnchorPanelProps {
  anchors: VisualAnchor[];
  courseId: string;
  onAnchorDeleted: (anchorId: string) => void;
  onPreviewAsStudent: () => void;
}

const TRUNCATE_LEN = 50;

function truncate(text: string): string {
  return text.length > TRUNCATE_LEN ? `${text.slice(0, TRUNCATE_LEN)}…` : text;
}

interface AnchorRowProps {
  anchor: VisualAnchor;
  onDelete: (id: string) => Promise<void>;
}

function AnchorRow({ anchor, onDelete }: AnchorRowProps) {
  const thumb = anchor.visualAsset?.webpUrl ?? anchor.visualAsset?.storageUrl ?? null;

  return (
    <li
      className="flex items-start gap-2 rounded-md border bg-card p-2 text-sm"
      data-testid={`anchor-row-${anchor.id}`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={anchor.visualAsset?.metadata?.altText ?? 'anchor image'}
          className="h-10 w-10 shrink-0 rounded object-cover border"
          loading="lazy"
        />
      ) : (
        <div className="h-10 w-10 shrink-0 rounded border bg-muted" aria-hidden="true" />
      )}

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="truncate text-xs font-medium leading-snug text-foreground">
          {truncate(anchor.anchorText)}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">#{anchor.documentOrder + 1}</span>
          {anchor.isBroken && (
            <Badge
              variant="outline"
              className="gap-1 text-[10px] text-orange-600 border-orange-400"
              data-testid={`broken-badge-${anchor.id}`}
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              Broken
            </Badge>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete anchor: ${truncate(anchor.anchorText)}`}
        onClick={() => void onDelete(anchor.id)}
        data-testid={`delete-anchor-btn-${anchor.id}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

export default function InstructorAnchorPanel({
  anchors,
  onAnchorDeleted,
  onPreviewAsStudent,
}: InstructorAnchorPanelProps) {
  const [, deleteAnchor] = useMutation(DELETE_VISUAL_ANCHOR);

  const handleDelete = useCallback(
    async (anchorId: string) => {
      const result = await deleteAnchor({ id: anchorId });
      if (!result.error) {
        onAnchorDeleted(anchorId);
      }
    },
    [deleteAnchor, onAnchorDeleted],
  );

  const sorted = [...anchors].sort((a, b) => a.documentOrder - b.documentOrder);

  return (
    <aside
      className="flex flex-col h-full"
      data-testid="instructor-anchor-panel"
      aria-label="Visual anchors panel"
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-semibold">Visual Anchors ({anchors.length})</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviewAsStudent}
          data-testid="preview-as-student-btn"
          className="gap-1 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview as Student
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sorted.length === 0 ? (
          <div
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border border-dashed',
              'py-10 text-center text-sm text-muted-foreground',
            )}
            data-testid="anchor-empty-state"
          >
            <p>No anchors yet.</p>
            <p className="text-xs">Select text in the document to create one.</p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Anchor list">
            {sorted.map((anchor) => (
              <AnchorRow key={anchor.id} anchor={anchor} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
