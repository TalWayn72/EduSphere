import { Clock, CheckCircle2 } from 'lucide-react';
import type { LiveSession } from './types';

export function StatusBadge({ status }: { status: LiveSession['status'] }) {
  if (status === 'LIVE') {
    return (
      <span
        data-testid="session-status-live"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        Live Now
      </span>
    );
  }
  if (status === 'SCHEDULED') {
    return (
      <span
        data-testid="session-status-scheduled"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"
      >
        <Clock className="h-3 w-3" />
        Scheduled
      </span>
    );
  }
  return (
    <span
      data-testid="session-status-ended"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground"
    >
      <CheckCircle2 className="h-3 w-3" />
      Ended
    </span>
  );
}
