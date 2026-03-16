import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LESSON_QUERY } from '@/lib/graphql/lesson.queries';
import type { LessonQueryData } from './types';
import { extractResults } from './useLessonResults';
import { AddVideoPanel } from './AddVideoPanel';
import { ResultsGrid } from './ResultsGrid';

// ── Main Page (orchestrator) ─────────────────────────────────────────────────

export function LessonResultsPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  // Defer query until after mount to prevent React concurrent-mode setState-during-render
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching, error }] = useQuery<LessonQueryData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause: !mounted || !lessonId,
  });

  useEffect(() => {
    if (error) console.error('[LessonResultsPage] Query error:', error.message);
  }, [error]);

  if (!mounted || fetching) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const lesson = data?.lesson;
  if (!lesson) {
    return (
      <Layout>
        <div className="p-6 text-muted-foreground">השיעור לא נמצא</div>
      </Layout>
    );
  }

  const results = lesson.pipeline?.currentRun?.results ?? [];
  const runStatus = lesson.pipeline?.currentRun?.status;
  const completedAt = lesson.pipeline?.currentRun?.completedAt;
  const hasResults = results.length > 0;
  const r = extractResults(results, lesson.assets);

  return (
    <Layout>
      <PageShell size="md" className="p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          className="mb-2"
          items={[
            { label: 'Courses', href: '/courses' },
            { label: 'Course', href: `/courses/${courseId}` },
            { label: lesson.title, href: `/courses/${courseId}/lessons/${lessonId}` },
            { label: 'Results' },
          ]}
        />
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}`)}
          >
            {lesson.title} ←
          </Button>
          <h1 className="text-2xl font-bold">תוצאות Pipeline</h1>
        </div>

        {/* Run status badge */}
        {runStatus && (
          <div className="flex items-center gap-2 mb-4 text-sm" data-testid="run-status-badge">
            {runStatus === 'COMPLETED' && <span className="text-green-600 font-medium">✅ הושלם</span>}
            {runStatus === 'RUNNING'   && <span className="text-blue-600 font-medium">⏳ מריץ...</span>}
            {runStatus === 'FAILED'    && <span className="text-red-600 font-medium">❌ נכשל</span>}
            {runStatus === 'CANCELLED' && <span className="text-muted-foreground font-medium">⛔ בוטל</span>}
            {completedAt && (
              <span className="text-muted-foreground text-xs">
                {new Date(completedAt).toLocaleString('he-IL')}
              </span>
            )}
            <button
              className="ml-auto text-xs text-blue-600 hover:underline"
              onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)}
              data-testid="open-pipeline-btn"
            >
              פתח Pipeline Builder
            </button>
          </div>
        )}

        {/* Empty state */}
        {!hasResults && (
          <div>
            <div className="text-center py-10 text-muted-foreground" data-testid="empty-results">
              <p className="text-4xl mb-3">⏳</p>
              <p className="text-base">אין תוצאות עדיין. הפעל את ה-Pipeline תחילה.</p>
              <Button
                className="mt-4"
                onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)}
                data-testid="open-pipeline-from-empty"
              >
                פתח Pipeline Builder
              </Button>
            </div>
            {lessonId && courseId && (
              <AddVideoPanel
                lessonId={lessonId}
                courseId={courseId}
                lessonTitle={lesson.title}
              />
            )}
          </div>
        )}

        {/* Results */}
        {hasResults && courseId && lessonId && (
          <ResultsGrid courseId={courseId} lessonId={lessonId} r={r} />
        )}
      </PageShell>
    </Layout>
  );
}
