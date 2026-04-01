/**
 * EmbeddingCoverageChart — CSS-only bar chart showing % of content indexed per course.
 * Green: >80%, Yellow: 40-80%, Red: <40%.
 */
/* eslint-disable edusphere-design-system/require-page-header -- sub-component, not a page */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseBreakdown } from './EmbeddingDashboardPage.stats';

/** Determine bar color class based on coverage percentage. */
function getCoverageColor(pct: number): string {
  if (pct > 80) return 'bg-green-500 dark:bg-green-600';
  if (pct >= 40) return 'bg-yellow-500 dark:bg-yellow-600';
  return 'bg-red-500 dark:bg-red-600';
}

/** Determine text color class for the percentage label. */
function getCoverageTextColor(pct: number): string {
  if (pct > 80) return 'text-green-700 dark:text-green-400';
  if (pct >= 40) return 'text-yellow-700 dark:text-yellow-400';
  return 'text-red-700 dark:text-red-400';
}

interface EmbeddingCoverageChartProps {
  courses: CourseBreakdown[];
}

export function EmbeddingCoverageChart({
  courses,
}: EmbeddingCoverageChartProps) {
  const { t } = useTranslation('admin');

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t('embeddings.noCoverageData', 'No courses with embedding data')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="embedding-coverage-chart">
      <CardHeader>
        <CardTitle className="text-base">
          {t('embeddings.coverageTitle', 'Embedding Coverage by Course')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="space-y-3"
          role="list"
          aria-label={t(
            'embeddings.coverageLabel',
            'Course embedding coverage'
          )}
        >
          {courses.map((course) => {
            const pct =
              course.sourceCount > 0
                ? Math.round((course.indexedCount / course.sourceCount) * 100)
                : 0;

            return (
              <div
                key={course.courseId}
                role="listitem"
                data-testid={`coverage-bar-${course.courseId}`}
                className="space-y-1"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[200px] font-medium text-foreground">
                    {course.courseTitle}
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${getCoverageTextColor(pct)}`}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="h-3 w-full rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${course.courseTitle}: ${pct}% indexed`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getCoverageColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {course.indexedCount}/{course.sourceCount}{' '}
                  {t('embeddings.sourcesIndexed', 'sources indexed')}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
