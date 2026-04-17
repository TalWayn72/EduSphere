/**
 * ChangeInlineMarker — renders a single AI tracked change inline.
 *
 * - ACCEPTED: shows replacement text in green
 * - REJECTED: shows original text in muted colour, replacement hidden
 * - PENDING: shows original (red strikethrough) + replacement (green) side-by-side
 *            with Accept / Reject buttons
 *
 * Text is Hebrew RTL; dir="rtl" is set on the wrapper.
 */
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  PolishedBlockChange,
  PolishedChangeStatus,
} from './polished-transcript.types';

interface ChangeInlineMarkerProps {
  change: PolishedBlockChange;
  /** Optimistic decision from local Zustand store */
  localDecision?: PolishedChangeStatus;
  onAccept: (changeId: string) => void;
  onReject: (changeId: string) => void;
  disabled?: boolean;
}

export function ChangeInlineMarker({
  change,
  localDecision,
  onAccept,
  onReject,
  disabled = false,
}: ChangeInlineMarkerProps) {
  const { t } = useTranslation('content');
  const decision = localDecision ?? change.status;

  if (decision === 'ACCEPTED') {
    return (
      <mark
        className="bg-transparent text-green-700 dark:text-green-400 not-italic"
        data-testid="change-accepted"
        data-change-id={change.id}
        dir="rtl"
      >
        {change.replacementFragment || null}
      </mark>
    );
  }

  if (decision === 'REJECTED') {
    return (
      <span
        className="text-muted-foreground"
        data-testid="change-rejected"
        data-change-id={change.id}
        dir="rtl"
      >
        {change.originalFragment || null}
      </span>
    );
  }

  // PENDING — show diff with controls
  return (
    <span
      className="inline-flex items-baseline gap-0.5 align-baseline"
      data-testid="change-pending"
      data-change-id={change.id}
      data-change-type={change.changeType}
      dir="rtl"
    >
      {change.originalFragment && (
        <del className="text-red-600 dark:text-red-400 no-underline line-through text-sm">
          {change.originalFragment}
        </del>
      )}
      {change.replacementFragment && (
        <ins className="text-green-700 dark:text-green-400 no-underline text-sm not-italic">
          {change.replacementFragment}
        </ins>
      )}
      <span className="inline-flex items-center gap-0.5 ms-1" dir="ltr">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-green-600 dark:text-green-400 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={() => onAccept(change.id)}
              disabled={disabled}
              aria-label={t('polishedTranscript.acceptChange')}
              data-testid="accept-change-btn"
            >
              <Check className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {t('polishedTranscript.acceptChange')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => onReject(change.id)}
              disabled={disabled}
              aria-label={t('polishedTranscript.rejectChange')}
              data-testid="reject-change-btn"
            >
              <X className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {t('polishedTranscript.rejectChange')}
          </TooltipContent>
        </Tooltip>
      </span>
    </span>
  );
}
