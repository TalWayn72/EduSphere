import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { LESSON_QUERY } from '@/lib/graphql/lesson.queries';
import { login } from '@/lib/auth';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AUTH_ERROR_PATTERNS = [
  'unauthorized',
  'authentication required',
  'unauthenticated',
];

function isAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return AUTH_ERROR_PATTERNS.some((p) => lower.includes(p));
}

interface LessonData {
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
    pipeline?: { id: string; status: string };
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'טיוטה', color: 'bg-muted text-foreground' },
  PROCESSING: { label: 'בעיבוד...', color: 'bg-yellow-100 text-yellow-700' },
  READY: { label: 'מוכן', color: 'bg-green-100 text-green-700' },
  PUBLISHED: { label: 'פורסם', color: 'bg-blue-100 text-blue-700' },
};

const ASSET_ICONS: Record<string, string> = {
  VIDEO: '🎥',
  AUDIO: '🎙️',
  NOTES: '📄',
  WHITEBOARD: '📋',
};

export function LessonDetailPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const navigate = useNavigate();

  // Defer query to prevent urql cache race with concurrently-unmounting siblings
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isValidId = lessonId ? UUID_RE.test(lessonId) : false;

  const [{ data, fetching, error }] = useQuery<LessonData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause: !mounted || !lessonId || !isValidId,
  });

  if (!mounted || fetching) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  if (!isValidId) {
    return (
      <Layout>
        <div className="p-6 text-muted-foreground">השיעור לא נמצא</div>
      </Layout>
    );
  }

  if (error) {
    if (isAuthError(error.message)) {
      return (
        <Layout>
          <div className="p-6 space-y-3">
            <p className="text-amber-700 font-medium dark:text-amber-300">הסשן פג תוקף</p>
            <p className="text-sm text-muted-foreground">יש להתחבר מחדש כדי להמשיך.</p>
            <Button onClick={() => login()}>התחבר מחדש</Button>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="p-6 text-red-600 dark:text-red-400">שגיאה בטעינת השיעור. אנא נסו שוב מאוחר יותר.</div>
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

  const statusInfo = STATUS_LABELS[lesson.status] ?? {
    label: lesson.status,
    color: 'bg-muted text-muted-foreground',
  };

  return (
    <Layout>
      <PageShell size="sm" className="max-w-3xl p-6">
        <Breadcrumbs
          className="mb-4"
          items={[
            { label: 'Courses', href: '/courses' },
            { label: 'Course', href: `/courses/${courseId}` },
            { label: lesson.title },
          ]}
        />
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            ← חזרה לקורס
          </Button>
        </div>

        <div className="bg-card rounded-xl border p-6 mb-4">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>סוג: {lesson.type === 'THEMATIC' ? 'הגות' : 'על הסדר'}</span>
            {lesson.series && <span>סדרה: {lesson.series}</span>}
            {lesson.lessonDate && (
              <span>
                תאריך: {new Date(lesson.lessonDate).toLocaleDateString('he-IL')}
              </span>
            )}
          </div>
        </div>

        {lesson.assets.length > 0 && (
          <div className="bg-card rounded-xl border p-4 mb-4">
            <h2 className="text-base font-semibold mb-3">חומרים</h2>
            <div className="space-y-2">
              {lesson.assets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2 text-sm">
                  <span>{ASSET_ICONS[asset.assetType] ?? '📁'}</span>
                  <span className="font-medium">{asset.assetType}</span>
                  {asset.sourceUrl && (
                    <a
                      href={asset.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 truncate dark:text-blue-400"
                    >
                      {asset.sourceUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              navigate(`/courses/${courseId}/lessons/${lessonId}/preview`)
            }
          >
            👁 תצוגה מקדימה
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)
            }
          >
            🔧 פתח Pipeline
          </Button>
          {(lesson.status === 'READY' || lesson.status === 'PUBLISHED') && (
            <Button
              className="flex-1"
              onClick={() =>
                navigate(`/courses/${courseId}/lessons/${lessonId}/results`)
              }
            >
              📊 צפה בתוצאות
            </Button>
          )}
        </div>
      </PageShell>
    </Layout>
  );
}
