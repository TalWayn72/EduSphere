/**
 * EmbeddingActivityLog — Table showing recent embedding operations.
 * Auto-refreshes every 30 seconds; pauses when tab is not visible.
 * Memory safe: clears interval on unmount + cleans up visibility listener.
 */
/* eslint-disable edusphere-design-system/require-page-header -- sub-component, not a page */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EMBEDDING_ACTIVITY_QUERY } from '@/lib/graphql/embedding.queries';

export interface EmbeddingActivity {
  id: string;
  timestamp: string;
  courseName: string;
  operation: 'index' | 'reindex';
  status: 'completed' | 'in_progress' | 'failed';
  count: number;
}

const POLL_INTERVAL_MS = 30_000;

function StatusBadge({ status }: { status: EmbeddingActivity['status'] }) {
  const { t } = useTranslation('admin');
  const variants: Record<
    EmbeddingActivity['status'],
    { label: string; className: string }
  > = {
    completed: {
      label: t('embeddings.statusCompleted', 'Completed'),
      className:
        'border-green-300 dark:border-green-600 text-green-700 dark:text-green-400',
    },
    in_progress: {
      label: t('embeddings.statusInProgress', 'In Progress'),
      className:
        'border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400',
    },
    failed: {
      label: t('embeddings.statusFailed', 'Failed'),
      className:
        'border-red-300 dark:border-red-600 text-red-700 dark:text-red-400',
    },
  };
  const v = variants[status];
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}

export function EmbeddingActivityLog() {
  const { t } = useTranslation('admin');
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [result, reexecute] = useQuery<{
    embeddingActivity: EmbeddingActivity[];
  }>({
    query: EMBEDDING_ACTIVITY_QUERY,
    pause: !mounted,
  });

  const refresh = useCallback(() => {
    reexecute({ requestPolicy: 'network-only' });
  }, [reexecute]);

  // Auto-refresh every 30s, pause when tab hidden. Memory safe cleanup.
  useEffect(() => {
    function startPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        stopPolling();
      } else {
        refresh();
        startPolling();
      }
    }

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  const { data, fetching, error } = result;
  const activities = data?.embeddingActivity ?? [];

  if (fetching && activities.length === 0) {
    return (
      <Card data-testid="embedding-activity-log">
        <CardHeader>
          <CardTitle className="text-base">
            {t('embeddings.activityTitle', 'Recent Activity')}
          </CardTitle>
        </CardHeader>
        <CardContent
          className="space-y-2"
          aria-busy="true"
          aria-label={t('embeddings.loadingActivity', 'Loading activity log')}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error && activities.length === 0) {
    return (
      <Card data-testid="embedding-activity-log">
        <CardHeader>
          <CardTitle className="text-base">
            {t('embeddings.activityTitle', 'Recent Activity')}
          </CardTitle>
        </CardHeader>
        <CardContent
          role="alert"
          className="py-4 text-center text-sm text-destructive"
        >
          {t('embeddings.activityError', 'Failed to load activity log')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="embedding-activity-log">
      <CardHeader>
        <CardTitle className="text-base">
          {t('embeddings.activityTitle', 'Recent Activity')}
        </CardTitle>
      </CardHeader>
      <CardContent aria-live="polite" aria-atomic="false">
        {activities.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('embeddings.noActivity', 'No recent embedding operations')}
          </p>
        ) : (
          <Table aria-label={t('embeddings.activityTitle', 'Recent Activity')}>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">
                  {t('embeddings.colTimestamp', 'Timestamp')}
                </TableHead>
                <TableHead scope="col">
                  {t('embeddings.colCourse', 'Course')}
                </TableHead>
                <TableHead scope="col">
                  {t('embeddings.colOperation', 'Operation')}
                </TableHead>
                <TableHead scope="col" className="text-center">
                  {t('embeddings.colStatus', 'Status')}
                </TableHead>
                <TableHead scope="col" className="text-right">
                  {t('embeddings.colCount', 'Count')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a) => (
                <TableRow key={a.id} data-testid={`activity-row-${a.id}`}>
                  <TableCell className="text-sm tabular-nums">
                    {new Date(a.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-[180px]">
                    {a.courseName}
                  </TableCell>
                  <TableCell className="capitalize">{a.operation}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
