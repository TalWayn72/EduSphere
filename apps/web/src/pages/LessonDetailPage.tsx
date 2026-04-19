import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { LESSON_QUERY } from '@/lib/graphql/lesson.queries';
import { login } from '@/lib/auth';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthRole } from '@/hooks/useAuthRole';

const EDITOR_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const { t } = useTranslation('courses');
  const role = useAuthRole();
  const canEnrich = EDITOR_ROLES.has(role ?? '');

  // Defer query to prevent urql cache race with concurrently-unmounting siblings
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div className="p-6 text-muted-foreground">
          {t('lesson.notFound', 'Lesson not found')}
        </div>
      </Layout>
    );
  }

  if (error) {
    if (isAuthError(error.message)) {
      return (
        <Layout>
          <div className="p-6 space-y-3">
            <p className="text-amber-700 font-medium dark:text-amber-300">
              {t('lesson.sessionExpired', 'Session expired')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('lesson.pleaseLogInAgain', 'Please log in again to continue.')}
            </p>
            <Button onClick={() => login()}>
              {t('lesson.logInAgain', 'Log in again')}
            </Button>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="p-6 text-red-600 dark:text-red-400">
          {t(
            'lesson.loadError',
            'Error loading lesson. Please try again later.'
          )}
        </div>
      </Layout>
    );
  }

  const lesson = data?.lesson;
  if (!lesson) {
    return (
      <Layout>
        <div className="p-6 text-muted-foreground">
          {t('lesson.notFound', 'Lesson not found')}
        </div>
      </Layout>
    );
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    DRAFT: {
      label: t('lesson.statusDraft', 'Draft'),
      color: 'bg-muted text-foreground',
    },
    PROCESSING: {
      label: t('lesson.statusProcessing', 'Processing...'),
      color: 'bg-yellow-100 text-yellow-700',
    },
    READY: {
      label: t('lesson.statusReady', 'Ready'),
      color: 'bg-green-100 text-green-700',
    },
    PUBLISHED: {
      label: t('lesson.statusPublished', 'Published'),
      color: 'bg-blue-100 text-blue-700',
    },
  };

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
            { label: t('backToCourses', 'Courses'), href: '/courses' },
            {
              label: t('courseDetails', 'Course'),
              href: `/courses/${courseId}`,
            },
            { label: lesson.title },
          ]}
        />
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            ← {t('lesson.backToCourse', 'Back to Course')}
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
            <span>
              {t('lesson.type', 'Type')}:{' '}
              {lesson.type === 'THEMATIC'
                ? t('createLesson.typeThematic')
                : t('createLesson.typeSequential')}
            </span>
            {lesson.series && (
              <span>
                {t('lesson.series', 'Series')}: {lesson.series}
              </span>
            )}
            {lesson.lessonDate && (
              <span>
                {t('lesson.date', 'Date')}:{' '}
                {new Date(lesson.lessonDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {lesson.assets.length > 0 && (
          <div className="bg-card rounded-xl border p-4 mb-4">
            <h2 className="text-base font-semibold mb-3">
              {t('lesson.materials', 'Materials')}
            </h2>
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
            👁 {t('lesson.preview', 'Preview')}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`)
            }
          >
            🔧 {t('lesson.openPipeline', 'Open Pipeline')}
          </Button>
          {canEnrich && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              data-testid="ai-enrich-btn"
              onClick={() => navigate(`/lesson/${lessonId}/edit`)}
            >
              <Sparkles className="h-4 w-4" />
              {t('lesson.aiEnrich', 'AI Enrich')}
            </Button>
          )}
          {(lesson.status === 'READY' || lesson.status === 'PUBLISHED') && (
            <Button
              className="flex-1"
              onClick={() =>
                navigate(`/courses/${courseId}/lessons/${lessonId}/results`)
              }
            >
              📊 {t('lesson.viewResults', 'View Results')}
            </Button>
          )}
        </div>
      </PageShell>
    </Layout>
  );
}
