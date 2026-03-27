/**
 * Stat cards and course table sub-components for EmbeddingDashboardPage.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2 } from 'lucide-react';

export interface CourseBreakdown {
  courseId: string;
  courseTitle: string;
  sourceCount: number;
  indexedCount: number;
  chunkCount: number;
}

export interface EmbeddingStats {
  totalSources: number;
  indexedSources: number;
  pendingSources: number;
  failedSources: number;
  totalChunks: number;
  courseBreakdown: CourseBreakdown[];
}

function StatCard({
  testId,
  title,
  value,
  description,
  variant = 'default',
}: {
  testId: string;
  title: string;
  value: string | number;
  description: string;
  variant?: 'default' | 'success' | 'warning';
}) {
  const borderClass = variant === 'success'
    ? 'border-l-4 border-l-green-500'
    : variant === 'warning'
      ? 'border-l-4 border-l-yellow-500'
      : '';

  return (
    <Card data-testid={testId} className={borderClass} aria-label={`${title}: ${value}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" aria-hidden="true">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: EmbeddingStats }) {
  const { t } = useTranslation('admin');
  const indexRate = stats.totalSources > 0
    ? Math.round((stats.indexedSources / stats.totalSources) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        testId="stat-total-sources"
        title={t('embeddings.totalSources', 'Total Sources')}
        value={stats.totalSources}
        description={t('embeddings.allKnowledgeSources', 'All knowledge sources')}
      />
      <StatCard
        testId="stat-indexed"
        title={t('embeddings.indexed', 'Indexed')}
        value={`${stats.indexedSources} (${indexRate}%)`}
        description={t('embeddings.withEmbeddings', 'Sources with embeddings')}
        variant="success"
      />
      <StatCard
        testId="stat-pending"
        title={t('embeddings.pending', 'Pending')}
        value={stats.pendingSources}
        description={t('embeddings.awaitingIndexing', 'Awaiting indexing')}
        variant={stats.pendingSources > 0 ? 'warning' : 'default'}
      />
      <StatCard
        testId="stat-total-chunks"
        title={t('embeddings.totalChunks', 'Total Chunks')}
        value={stats.totalChunks.toLocaleString()}
        description={t('embeddings.embeddingVectors', 'Embedding vectors stored')}
      />
    </div>
  );
}

export function CourseTable({ courses }: { courses: CourseBreakdown[] }) {
  const { t } = useTranslation('admin');

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('embeddings.noCourses', 'No courses with sources found')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('embeddings.courseBreakdown', 'Course Breakdown')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table aria-label={t('embeddings.courseBreakdown', 'Course Breakdown')}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t('embeddings.course', 'Course')}</TableHead>
              <TableHead scope="col" className="text-center">{t('embeddings.sources', 'Sources')}</TableHead>
              <TableHead scope="col" className="text-center">{t('embeddings.indexed', 'Indexed')}</TableHead>
              <TableHead scope="col" className="text-center">{t('embeddings.chunks', 'Chunks')}</TableHead>
              <TableHead scope="col" className="text-center">{t('embeddings.status', 'Status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.courseId} data-testid={`course-row-${c.courseId}`}>
                <TableCell className="font-medium truncate max-w-[200px]">
                  {c.courseTitle}
                </TableCell>
                <TableCell className="text-center">{c.sourceCount}</TableCell>
                <TableCell className="text-center">{c.indexedCount}</TableCell>
                <TableCell className="text-center">{c.chunkCount.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  {c.indexedCount === c.sourceCount ? (
                    <Badge variant="outline" className="border-green-300 dark:border-green-600 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                      {t('embeddings.complete', 'Complete')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400">
                      {c.indexedCount}/{c.sourceCount}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
