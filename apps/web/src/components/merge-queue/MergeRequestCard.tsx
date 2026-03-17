/**
 * MergeRequestCard — single annotation proposal card for the merge queue.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import type { MergeRequest } from '@/pages/InstructorMergeQueuePage';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  request: MergeRequest;
  onApprove: () => void;
  onReject: () => void;
}

export function MergeRequestCard({ request: req, onApprove, onReject }: Props) {
  return (
    <Card data-testid={`merge-request-${req.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{req.authorName}</CardTitle>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {req.courseName}
              {req.contentTimestamp !== undefined && (
                <span className="font-mono bg-muted px-1 rounded">
                  {formatTimestamp(req.contentTimestamp)}
                </span>
              )}
              <span>{timeAgo(req.submittedAt)}</span>
            </div>
          </div>
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            Pending
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Proposed annotation:</p>
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm" data-testid={`proposal-content-${req.id}`}>
            <span className="text-green-700 font-mono text-xs mr-1">+</span>
            {req.content}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Reason:</p>
          <p className="text-sm text-muted-foreground italic">&quot;{req.description}&quot;</p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="h-8 gap-1 bg-green-600 hover:bg-green-700"
            onClick={onApprove}
            data-testid={`approve-btn-${req.id}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={onReject}
            data-testid={`reject-btn-${req.id}`}
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
