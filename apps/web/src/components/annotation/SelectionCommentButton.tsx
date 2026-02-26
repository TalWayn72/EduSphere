import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import type { SelectionPosition } from './AnnotatedDocumentViewer';

interface Props {
  position: SelectionPosition | null;
  onAddComment: () => void;
}

export function SelectionCommentButton({ position, onAddComment }: Props) {
  if (!position) return null;

  return (
    <button
      style={{
        position: 'fixed',
        top: position.y - 36,
        left: position.x,
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors"
      onClick={onAddComment}
      data-testid="add-comment-btn"
    >
      <MessageSquarePlus className="h-3.5 w-3.5" />
      Add Comment
    </button>
  );
}
