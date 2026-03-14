/**
 * MergeQueueStats — stats bar and resolved items for merge queue.
 */
import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { MergeRequest } from '@/pages/InstructorMergeQueuePage';

export function StatsBar({ requests }: { requests: MergeRequest[] }) {
  const pending = requests.filter((r) => r.status === 'pending');
  return (
    <div className="flex gap-4 text-sm">
      <span className="flex items-center gap-1 text-amber-600 font-medium">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
        {pending.length} pending
      </span>
      <span className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {requests.filter((r) => r.status === 'approved').length} approved
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <XCircle className="h-3.5 w-3.5" />
        {requests.filter((r) => r.status === 'rejected').length} rejected
      </span>
    </div>
  );
}

export function ResolvedList({ resolved }: { resolved: MergeRequest[] }) {
  if (resolved.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolved</p>
      {resolved.map((req) => (
        <div key={req.id} className="flex items-start gap-3 p-3 rounded-md border bg-muted/30 text-sm" data-testid={`resolved-${req.id}`}>
          {req.status === 'approved'
            ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-xs">{req.authorName}</p>
            <p className="text-muted-foreground text-xs truncate">{req.content}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {req.status}
          </span>
        </div>
      ))}
    </div>
  );
}
