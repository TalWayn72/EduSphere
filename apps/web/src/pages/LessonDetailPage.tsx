import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { LESSON_QUERY } from '@/lib/graphql/lesson.queries';
import { login } from '@/lib/auth';

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

  const [{ data, fetching, error }] = useQuery<LessonData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause: !mounted || !lessonId,
  });

  if (!mounted || fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    if (isAuthError(error.message)) {
      return (
        <Layout>
          <div className="p-6 space-y-3">
            <p className="text-amber-700 font-medium">הסשן פג תוקף</p>
            <p className="text-sm text-muted-foreground">יש להתחבר מחדש כדי להמשיך.</p>
            <Button onClick={() => login()}>התחבר מחדש</Button>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="p-6 text-red-600">שגיאה: {error.message}</div>
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
      <div className="max-w-3xl mx-auto p-6">
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
                      className="text-blue-500 truncate"
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
      </div>
    </Layout>
  );
}
