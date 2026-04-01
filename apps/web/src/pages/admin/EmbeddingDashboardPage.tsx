/**
 * EmbeddingDashboardPage — Admin view of embedding/indexing status.
 * Route: /admin/embeddings
 *
 * Sprint 3: reindex confirmation dialog, coverage chart, activity log, toasts.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import {
  EMBEDDING_STATS_QUERY,
  REINDEX_COURSE_EMBEDDINGS_MUTATION,
} from '@/lib/graphql/embedding.queries';
import type { EmbeddingStats } from './EmbeddingDashboardPage.stats';
import { StatsCards, CourseTable } from './EmbeddingDashboardPage.stats';
import { EmbeddingCoverageChart } from './EmbeddingCoverageChart';
import { EmbeddingActivityLog } from './EmbeddingActivityLog';
import { EmbeddingReindexDialog } from './EmbeddingReindexDialog';

export function EmbeddingDashboardPage() {
  const { t } = useTranslation('admin');
  const [mounted, setMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [result, reexecute] = useQuery<{ embeddingStats: EmbeddingStats }>({
    query: EMBEDDING_STATS_QUERY,
    pause: !mounted,
  });

  const [reindexResult, reindex] = useMutation(
    REINDEX_COURSE_EMBEDDINGS_MUTATION
  );

  const handleReindexConfirm = useCallback(async () => {
    const res = await reindex({});
    setDialogOpen(false);
    if (res.error) {
      toast.error(
        t('embeddings.reindexError', 'Reindex failed. Please try again.')
      );
    } else {
      toast.success(
        t('embeddings.reindexSuccess', 'Reindex started successfully.')
      );
      reexecute({ requestPolicy: 'network-only' });
    }
  }, [reindex, reexecute, t]);

  const { data, fetching, error } = result;
  const stats = data?.embeddingStats;

  return (
    <AdminLayout
      title={t('embeddings.title', 'Embedding Dashboard')}
      description={t(
        'embeddings.description',
        'Monitor and manage content indexing status'
      )}
    >
      <div data-testid="embedding-dashboard-page" className="space-y-6">
        <h1 className="sr-only">
          {t('embeddings.title', 'Embedding Dashboard')}
        </h1>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="border-blue-400 text-blue-700 dark:border-blue-500 dark:text-blue-300"
          >
            <Database className="h-3 w-3 mr-1" aria-hidden="true" />
            RAG
          </Badge>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reexecute({ requestPolicy: 'network-only' })}
              disabled={fetching}
              data-testid="refresh-stats-btn"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${fetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {t('embeddings.refresh', 'Refresh')}
            </Button>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              disabled={reindexResult.fetching}
              data-testid="reindex-all-btn"
            >
              {reindexResult.fetching ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-1 animate-spin"
                    aria-hidden="true"
                  />
                  {t('embeddings.reindexing', 'Reindexing...')}
                </>
              ) : (
                t('embeddings.reindexAll', 'Reindex All')
              )}
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {fetching && !stats && (
          <div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            data-testid="embedding-skeleton"
            aria-busy="true"
            aria-label={t(
              'embeddings.loadingStats',
              'Loading embedding statistics'
            )}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !fetching && (
          <Card>
            <CardContent
              role="alert"
              className="py-8 text-center text-destructive text-sm"
            >
              <AlertCircle
                className="h-5 w-5 mx-auto mb-2"
                aria-hidden="true"
              />
              {t('embeddings.loadError', 'Failed to load embedding statistics')}
            </CardContent>
          </Card>
        )}

        {stats && <StatsCards stats={stats} />}

        {stats && (
          <div className="grid gap-6 lg:grid-cols-2">
            <EmbeddingCoverageChart courses={stats.courseBreakdown} />
            <EmbeddingActivityLog />
          </div>
        )}

        {stats && <CourseTable courses={stats.courseBreakdown} />}
      </div>

      <EmbeddingReindexDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={() => void handleReindexConfirm()}
        loading={reindexResult.fetching}
        totalSources={stats?.totalSources ?? 0}
        courseCount={stats?.courseBreakdown.length ?? 0}
      />
    </AdminLayout>
  );
}
