/**
 * VerifiedCitationIndicator — inline badge showing citation verification status.
 *
 * Color-coded by status: VERIFIED (green/blue), UNVERIFIED (amber),
 * FAILED (red), EDITED (purple). Shows tooltip with details on hover.
 */
import { CheckCircle2, AlertCircle, XCircle, PenLine } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Types ─────────────────────────────────────────────────────────────────────

type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'FAILED' | 'EDITED';

interface VerifiedCitationIndicatorProps {
  status: string;
  confidence: number;
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusConfig(status: string): {
  label: string;
  icon: React.ReactNode;
  className: string;
  tooltipDescription: string;
} {
  const normalized = status as VerificationStatus;
  switch (normalized) {
    case 'VERIFIED':
      return {
        label: 'Verified',
        icon: <CheckCircle2 className="h-3 w-3" />,
        className:
          'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
        tooltipDescription: 'Citation matched and verified against source',
      };
    case 'UNVERIFIED':
      return {
        label: 'Unverified',
        icon: <AlertCircle className="h-3 w-3" />,
        className:
          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
        tooltipDescription: 'Citation detected but not yet verified',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        icon: <XCircle className="h-3 w-3" />,
        className:
          'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
        tooltipDescription: 'Citation verification failed',
      };
    case 'EDITED':
      return {
        label: 'Edited',
        icon: <PenLine className="h-3 w-3" />,
        className:
          'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
        tooltipDescription: 'Citation was manually edited by instructor',
      };
    default:
      return {
        label: status,
        icon: <AlertCircle className="h-3 w-3" />,
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        tooltipDescription: 'Unknown verification status',
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VerifiedCitationIndicator({
  status,
  confidence,
  className = '',
}: VerifiedCitationIndicatorProps) {
  const config = getStatusConfig(status);
  const confidencePercent = Math.round(confidence * 100);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium cursor-default ${config.className} ${className}`}
            data-testid="verified-citation-indicator"
            data-status={status}
          >
            {config.icon}
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs space-y-1">
          <p className="font-medium">{config.tooltipDescription}</p>
          <p className="text-muted-foreground">
            Confidence: {confidencePercent}%
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
