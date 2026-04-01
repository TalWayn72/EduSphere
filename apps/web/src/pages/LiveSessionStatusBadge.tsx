import { Radio, CheckCircle2 } from 'lucide-react';
import type { LiveSession } from './LiveSessionDetailPage.types';

export function StatusBadge({ status }: { status: LiveSession['status'] }) {
  if (status === 'LIVE') {
    return (
      <span
        data-testid="detail-status-live"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      >
        <span
          className="h-2 w-2 rounded-full bg-red-500 animate-pulse dark:bg-red-600"
          aria-hidden
        />
        Live Now
      </span>
    );
  }
  if (status === 'SCHEDULED') {
    return (
      <span
        data-testid="detail-status-scheduled"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      >
        <Radio className="h-3 w-3" aria-hidden />
        Scheduled
      </span>
    );
  }
  return (
    <span
      data-testid="detail-status-ended"
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-muted text-muted-foreground"
    >
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      Ended
    </span>
  );
}
