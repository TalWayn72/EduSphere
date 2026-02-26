/**
 * SelectionCommentButton — small floating button that appears above selected text.
 * Renders nothing when position is null (no active selection).
 */
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionCommentButtonProps {
  position: { x: number; y: number } | null;
  onAddComment: (position: { x: number; y: number }) => void;
}

export function SelectionCommentButton({
  position,
  onAddComment,
}: SelectionCommentButtonProps) {
  if (!position) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: position.y - 36,
        left: position.x,
        zIndex: 40,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        size="sm"
        className="h-7 px-2 text-xs gap-1 shadow-md"
        onClick={() => onAddComment(position)}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Add Comment
      </Button>
    </div>
  );
}
