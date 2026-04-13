/**
 * PersonalNotesPanel — Notes tab panel for live lesson.
 *
 * - Textarea bound to Zustand draftNote (persists across tab switches)
 * - "Add Note" saves to annotation system (PERSONAL layer) with current stream timestamp
 * - Lists all personal notes with mm:ss timestamp badge
 * - dir="auto" for Hebrew support
 */
import { useCallback } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useLiveSessionStore } from '@/stores/live-session.store';
import { AnnotationLayer } from '@/types/annotations';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PersonalNotesPanelProps {
  /** Session ID — used as fallback contentId if no lessonId provided */
  sessionId: string;
  /** Asset/content ID for annotation system — typically the lesson assetId or sessionId */
  contentId: string;
  /** Current stream position in milliseconds (0 for pre-stream) */
  currentTimestampMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestampMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = String(totalSec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PersonalNotesPanel({
  sessionId: _sessionId,
  contentId,
  currentTimestampMs,
}: PersonalNotesPanelProps) {
  const { draftNote, setDraftNote } = useLiveSessionStore();
  const { annotations, isPending, addAnnotation } = useAnnotations(contentId, [
    AnnotationLayer.PERSONAL,
  ]);

  const notes = annotations.filter(
    (a) => a.layer === AnnotationLayer.PERSONAL && !a.parentId
  );

  const handleAddNote = useCallback(() => {
    const trimmed = draftNote.trim();
    if (!trimmed || isPending) return;
    // useAnnotations.addAnnotation expects seconds, not ms
    addAnnotation(trimmed, AnnotationLayer.PERSONAL, currentTimestampMs / 1000);
    setDraftNote('');
  }, [draftNote, isPending, addAnnotation, currentTimestampMs, setDraftNote]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddNote();
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      data-testid="personal-notes-panel"
    >
      {/* Input area */}
      <div className="shrink-0 border-b p-3 space-y-2">
        <Textarea
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתוב הערה… (Ctrl+Enter לשמירה)"
          rows={3}
          className="resize-none text-sm"
          dir="auto"
          aria-label="Personal note"
          disabled={isPending}
          data-testid="notes-textarea"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatTimestampMs(currentTimestampMs)}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleAddNote}
            disabled={!draftNote.trim() || isPending}
            className="gap-1"
            data-testid="add-note-button"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            הוסף הערה
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <div
            className="flex items-center justify-center py-12 text-muted-foreground text-sm"
            data-testid="notes-empty"
          >
            <p dir="auto">No notes yet. Start typing above.</p>
          </div>
        ) : (
          notes.map((note) => <NoteItem key={note.id} note={note} />)
        )}
      </div>
    </div>
  );
}

// ── NoteItem ──────────────────────────────────────────────────────────────────

interface NoteItemProps {
  note: {
    id: string;
    content: string;
    contentTimestamp?: number;
    createdAt: string;
  };
}

function NoteItem({ note }: NoteItemProps) {
  const timestampLabel =
    note.contentTimestamp !== undefined
      ? formatTimestampMs(note.contentTimestamp * 1000)
      : null;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 space-y-1.5',
        'hover:border-primary/40 transition-colors'
      )}
      data-testid="note-item"
    >
      {timestampLabel && (
        <Badge
          variant="secondary"
          className="text-xs h-5 gap-1 font-mono"
          data-testid="note-timestamp"
        >
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
          {timestampLabel}
        </Badge>
      )}
      <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
        {note.content}
      </p>
    </div>
  );
}
