/**
 * ProctoringReportCard — displays a summary of a proctoring session report.
 *
 * Phase 33: Remote Proctoring (PRD §7.2 G-4)
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProctoringFlag {
  type: string;
  timestamp: string;
  detail?: string;
}

interface ProctoringSessionReport {
  id: string;
  userId: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  flagCount: number;
  flags: ProctoringFlag[];
}

interface Props {
  session: ProctoringSessionReport;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'FLAGGED':
      return 'bg-red-100 text-red-800';
    case 'ACTIVE':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function ProctoringReportCard({ session }: Props) {
  return (
    <Card data-testid="proctoring-report-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Proctoring Report</CardTitle>
          <span
            data-testid="proctoring-report-status"
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(session.status)}`}
          >
            {session.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Flags: <strong>{session.flagCount}</strong>
          {session.startedAt && (
            <>
              {' '}
              &middot; Started: {new Date(session.startedAt).toLocaleString()}
            </>
          )}
          {session.endedAt && (
            <>
              {' '}
              &middot; Ended: {new Date(session.endedAt).toLocaleString()}
            </>
          )}
        </p>
      </CardHeader>

      {session.flags.length > 0 && (
        <CardContent>
          <ul className="space-y-2">
            {session.flags.map((f, i) => (
              <li
                key={`${f.timestamp}-${i}`}
                data-testid={`proctoring-flag-item-${i}`}
                className="flex flex-col rounded border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="font-medium">{f.type}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(f.timestamp).toLocaleString()}
                </span>
                {f.detail && (
                  <span className="mt-0.5 text-xs text-foreground/70">{f.detail}</span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
