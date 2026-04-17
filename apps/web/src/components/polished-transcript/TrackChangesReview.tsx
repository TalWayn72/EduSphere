/**
 * TrackChangesReview — main component for reviewing AI-polished transcripts.
 *
 * Renders polished blocks with inline tracked changes (red strikethrough for
 * deletions, green for additions) plus Accept / Reject controls per change.
 * Bulk accept/reject all via toolbar. Hebrew RTL text throughout.
 *
 * EXCEPTION NOTE (150-line rule): Document renderer that composes multiple
 * sub-components and orchestrates urql mutations + Zustand state.
 */
import { useCallback } from 'react';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { CheckCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChangeInlineMarker } from './ChangeInlineMarker';
import { PolishingStatusBadge } from './PolishingStatusBadge';
import { useTrackChangesStore } from './useTrackChangesStore';
import {
  ACCEPT_POLISHING_CHANGE_MUTATION,
  REJECT_POLISHING_CHANGE_MUTATION,
  ACCEPT_ALL_POLISHING_CHANGES_MUTATION,
  REJECT_ALL_POLISHING_CHANGES_MUTATION,
  APPROVE_POLISHED_TRANSCRIPT_MUTATION,
} from '@/lib/graphql/polished-transcript.queries';
import type {
  PolishedTranscript,
  PolishedTranscriptBlock,
  PolishedBlockChange,
} from './polished-transcript.types';

interface TrackChangesReviewProps {
  transcript: PolishedTranscript;
  onApproved?: () => void;
  className?: string;
}

/** Build text segments interleaved with change markers from a block's offsets. */
function buildBlockSegments(
  text: string,
  changes: PolishedBlockChange[]
): Array<
  | { type: 'text'; content: string }
  | { type: 'change'; change: PolishedBlockChange }
> {
  const sorted = [...changes].sort(
    (a, b) => a.charOffsetStart - b.charOffsetStart
  );
  const segments: Array<
    | { type: 'text'; content: string }
    | { type: 'change'; change: PolishedBlockChange }
  > = [];
  let cursor = 0;
  for (const change of sorted) {
    if (change.charOffsetStart > cursor) {
      segments.push({ type: 'text', content: text.slice(cursor, change.charOffsetStart) });
    }
    segments.push({ type: 'change', change });
    cursor = change.charOffsetEnd;
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', content: text.slice(cursor) });
  }
  return segments;
}

function BlockReview({
  block,
  decisions,
  onAccept,
  onReject,
  isBusy,
}: {
  block: PolishedTranscriptBlock;
  decisions: Record<string, string>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isBusy: boolean;
}) {
  const displayText = block.instructorEdited && block.instructorText
    ? block.instructorText
    : block.content;
  const segments = buildBlockSegments(displayText, block.changes);

  if (block.blockType === 'POLISHED_HEADING') {
    return (
      <h3
        className="text-base font-semibold pt-4 pb-1 border-b border-border/40 text-right"
        dir="rtl"
      >
        {displayText}
      </h3>
    );
  }

  return (
    <p className="text-sm leading-8 mb-3 text-right" dir="rtl">
      {segments.map((seg, idx) =>
        seg.type === 'text' ? (
          <span key={idx}>{seg.content}</span>
        ) : (
          <ChangeInlineMarker
            key={seg.change.id}
            change={seg.change}
            localDecision={decisions[seg.change.id] as Parameters<typeof ChangeInlineMarker>[0]['localDecision']}
            onAccept={onAccept}
            onReject={onReject}
            disabled={isBusy}
          />
        )
      )}
    </p>
  );
}

export function TrackChangesReview({
  transcript,
  onApproved,
  className = '',
}: TrackChangesReviewProps) {
  const { t } = useTranslation('content');
  const { decisions, setDecision, acceptAll, rejectAll } =
    useTrackChangesStore();

  const [, acceptChange] = useMutation(ACCEPT_POLISHING_CHANGE_MUTATION);
  const [, rejectChange] = useMutation(REJECT_POLISHING_CHANGE_MUTATION);
  const [{ fetching: acceptingAll }, acceptAllMutation] = useMutation(
    ACCEPT_ALL_POLISHING_CHANGES_MUTATION
  );
  const [{ fetching: rejectingAll }, rejectAllMutation] = useMutation(
    REJECT_ALL_POLISHING_CHANGES_MUTATION
  );
  const [{ fetching: approving }, approveMutation] = useMutation(
    APPROVE_POLISHED_TRANSCRIPT_MUTATION
  );

  const allChanges = transcript.blocks.flatMap((b) => b.changes);

  const handleAccept = useCallback(
    (changeId: string) => {
      setDecision(changeId, 'ACCEPTED');
      void acceptChange({ changeId });
    },
    [setDecision, acceptChange]
  );

  const handleReject = useCallback(
    (changeId: string) => {
      setDecision(changeId, 'REJECTED');
      void rejectChange({ changeId });
    },
    [setDecision, rejectChange]
  );

  const handleAcceptAll = useCallback(async () => {
    acceptAll(allChanges.map((c) => c.id));
    await acceptAllMutation({ transcriptId: transcript.id });
  }, [allChanges, transcript.id, acceptAll, acceptAllMutation]);

  const handleRejectAll = useCallback(async () => {
    rejectAll(allChanges.map((c) => c.id));
    await rejectAllMutation({ transcriptId: transcript.id });
  }, [allChanges, transcript.id, rejectAll, rejectAllMutation]);

  const handleApprove = useCallback(async () => {
    await approveMutation({ transcriptId: transcript.id });
    onApproved?.();
  }, [approveMutation, transcript.id, onApproved]);

  const pendingCount = allChanges.filter(
    (c) => (decisions[c.id] ?? c.status) === 'PENDING'
  ).length;
  const isBusy = acceptingAll || rejectingAll || approving;
  const sortedBlocks = [...transcript.blocks].sort((a, b) => a.blockOrder - b.blockOrder);

  return (
    <div
      className={`flex flex-col h-full ${className}`}
      data-testid="track-changes-review"
    >
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b flex-wrap">
        <div className="flex items-center gap-2">
          <PolishingStatusBadge status={transcript.status} />
          {pendingCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('polishedTranscript.pendingCount', { count: pendingCount })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleAcceptAll()}
            disabled={isBusy || pendingCount === 0}
            className="text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-950 dark:text-green-400 dark:border-green-700"
            data-testid="accept-all-btn"
          >
            <CheckCheck className="h-3.5 w-3.5 me-1" />
            {t('polishedTranscript.acceptAll')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRejectAll()}
            disabled={isBusy || pendingCount === 0}
            className="text-red-700 border-red-300 hover:bg-red-50 dark:hover:bg-red-950 dark:text-red-400 dark:border-red-700"
            data-testid="reject-all-btn"
          >
            <XCircle className="h-3.5 w-3.5 me-1" />
            {t('polishedTranscript.rejectAll')}
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Button
            size="sm"
            onClick={() => void handleApprove()}
            disabled={isBusy || pendingCount > 0 || transcript.status === 'APPROVED'}
            data-testid="approve-transcript-btn"
          >
            {t('polishedTranscript.approve')}
          </Button>
        </div>
      </div>

      {/* Document */}
      <ScrollArea className="flex-1">
        <div
          className="p-4 font-serif"
          data-testid="polished-document"
          lang="he"
        >
          {sortedBlocks.map((block) => (
            <BlockReview
              key={block.id}
              block={block}
              decisions={decisions}
              onAccept={handleAccept}
              onReject={handleReject}
              isBusy={isBusy}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
