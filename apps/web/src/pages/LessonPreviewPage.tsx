/**
 * LessonPreviewPage — read-only student preview of a lesson.
 * Route: /courses/:courseId/lessons/:lessonId/preview
 *
 * Shows lesson content (title, description, structured notes, diagrams)
 * with a sticky preview banner. Hides all edit/mutation buttons.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LESSON_QUERY } from '@/lib/graphql/lesson.queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LessonPreviewData {
  lesson: {
    id: string;
    title: string;
    type: string;
    series?: string;
    lessonDate?: string;
    status: string;
    assets: Array<{
      id: string;
      assetType: string;
      sourceUrl?: string;
      fileUrl?: string;
    }>;
    pipeline?: {
      id: string;
      status: string;
      currentRun?: {
        results: Array<{
          id: string;
          moduleName: string;
          outputType: string;
          outputData?: Record<string, unknown> | null;
          fileUrl?: string | null;
        }>;
      } | null;
    } | null;
  } | null;
}

const ASSET_ICONS: Record<string, string> = {
  VIDEO: '🎥', AUDIO: '🎙️', NOTES: '📄', WHITEBOARD: '📋',
};

const OUTPUT_LABELS: Record<string, string> = {
  STRUCTURED_NOTES: 'סיכום מובנה',
  SUMMARIZATION: 'תקציר',
  DIAGRAM_GENERATOR: 'דיאגרמות',
  CITATION_VERIFIER: 'אימות מקורות',
  QA_GATE: 'בקרת איכות',
};

export function LessonPreviewPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isValidId = lessonId ? UUID_RE.test(lessonId) : false;

  const [{ data, fetching, error }] = useQuery<LessonPreviewData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause: !mounted || !lessonId || !isValidId,
  });

  if (!mounted || fetching) {
    return (
      <Layout>
        <PreviewBanner onClose={() => navigate(-1)} />
        <PageShell size="sm" className="max-w-3xl p-6">
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </PageShell>
      </Layout>
    );
  }

  if (!isValidId || error || !data?.lesson) {
    return (
      <Layout>
        <PreviewBanner onClose={() => navigate(-1)} />
        <PageShell size="sm" className="max-w-3xl p-6">
          <p className="text-muted-foreground">
            {error ? 'שגיאה בטעינת השיעור.' : 'השיעור לא נמצא.'}
          </p>
        </PageShell>
      </Layout>
    );
  }

  const lesson = data.lesson;
  const results = lesson.pipeline?.currentRun?.results ?? [];

  return (
    <Layout>
      <PreviewBanner onClose={() => navigate(`/courses/${courseId}/lessons/${lessonId}`)} />
      <PageShell size="sm" className="max-w-3xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>סוג: {lesson.type === 'THEMATIC' ? 'הגות' : 'על הסדר'}</span>
            {lesson.series && <span>סדרה: {lesson.series}</span>}
            {lesson.lessonDate && (
              <span>תאריך: {new Date(lesson.lessonDate).toLocaleDateString('he-IL')}</span>
            )}
          </div>
        </header>

        {lesson.assets.length > 0 && (
          <section className="bg-card rounded-xl border p-4 mb-4" aria-labelledby="assets-heading">
            <h2 id="assets-heading" className="text-base font-semibold mb-3">חומרי שיעור</h2>
            <div className="space-y-2">
              {lesson.assets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2 text-sm">
                  <span>{ASSET_ICONS[asset.assetType] ?? '📁'}</span>
                  <span className="font-medium">{asset.assetType}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section className="space-y-4" aria-labelledby="results-heading">
            <h2 id="results-heading" className="text-lg font-semibold">תוצרי השיעור</h2>
            {results.map((result) => (
              <article key={result.id} className="bg-card rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-2">
                  {OUTPUT_LABELS[result.moduleName] ?? result.moduleName}
                </h3>
                <Badge variant="secondary" className="mb-2">{result.outputType}</Badge>
                {result.outputData && (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                    {typeof result.outputData === 'object'
                      ? JSON.stringify(result.outputData, null, 2)
                      : String(result.outputData)}
                  </div>
                )}
                {result.fileUrl && (
                  <a href={result.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 text-sm underline mt-2 inline-block">
                    פתח קובץ
                  </a>
                )}
              </article>
            ))}
          </section>
        )}

        {results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-1">אין עדיין תוצרים לשיעור זה</p>
            <p className="text-sm">יש להריץ את ה-Pipeline כדי ליצור תוכן.</p>
          </div>
        )}
      </PageShell>
    </Layout>
  );
}

function PreviewBanner({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="sticky top-0 z-50 bg-amber-500 text-white px-6 py-2 flex items-center justify-between"
      role="banner"
      aria-label="מצב תצוגה מקדימה"
    >
      <span className="font-semibold text-sm">תצוגה מקדימה — כך יראו התלמידים את השיעור</span>
      <Button variant="ghost" size="sm" onClick={onClose}
        className="text-white hover:bg-amber-600" aria-label="סגור תצוגה מקדימה">
        ✕ סגור
      </Button>
    </div>
  );
}
