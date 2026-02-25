/**
 * CourseDetailPage — shows course overview, module list, and content items.
 * Route: /courses/:courseId
 *
 * Uses React 19 useTransition for the enroll/unenroll action so the UI
 * stays responsive while the mutation is in flight.
 */
import { useTransition, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { COURSE_DETAIL_QUERY } from '@/lib/graphql/content.queries';
import { ENROLL_COURSE_MUTATION, UNENROLL_COURSE_MUTATION } from '@/lib/graphql/content.queries';
import { MY_ENROLLMENTS_QUERY, MY_COURSE_PROGRESS_QUERY } from '@/lib/graphql/content.queries';
import { CourseModuleList } from './CourseDetailPage.modules';
import { SourceManager } from '@/components/SourceManager';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Users,
  BookMarked,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ContentItemSummary {
  id: string;
  title: string;
  contentType: string;
  duration: number | null;
  orderIndex: number;
}

interface ModuleSummary {
  id: string;
  title: string;
  orderIndex: number;
  contentItems: ContentItemSummary[];
}

interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  isPublished: boolean;
  instructorId: string;
  modules: ModuleSummary[];
}

interface CourseDetailResult {
  course: CourseDetailData | null;
}

interface EnrollmentData {
  myEnrollments: Array<{ courseId: string }>;
}

interface ProgressData {
  myCourseProgress: {
    totalItems: number;
    completedItems: number;
    percentComplete: number;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CourseDetailPage() {
  const { t } = useTranslation('courses');
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [{ data, fetching, error }] = useQuery<CourseDetailResult>({
    query: COURSE_DETAIL_QUERY,
    variables: { id: courseId },
    pause: !courseId,
  });

  const [{ data: enrollData }] = useQuery<EnrollmentData>({
    query: MY_ENROLLMENTS_QUERY,
  });

  const [{ data: progressData }] = useQuery<ProgressData>({
    query: MY_COURSE_PROGRESS_QUERY,
    variables: { courseId },
    pause: !courseId,
  });

  const [, enrollMutation] = useMutation(ENROLL_COURSE_MUTATION);
  const [, unenrollMutation] = useMutation(UNENROLL_COURSE_MUTATION);

  // useTransition keeps the UI interactive (non-blocking) during the
  // enroll/unenroll mutation.  isEnrolling replaces the old useState flag.
  const [isEnrolling, startEnrollTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const course = data?.course;
  const isEnrolled = enrollData?.myEnrollments?.some((e) => e.courseId === courseId) ?? false;
  const progress = progressData?.myCourseProgress;

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleEnroll = () => {
    startEnrollTransition(async () => {
      if (isEnrolled) {
        await unenrollMutation({ courseId });
        showToast(t('unenroll'));
      } else {
        await enrollMutation({ courseId });
        showToast(t('enrolled'));
      }
    });
  };

  if (error) {
    return (
      <Layout>
        <div className="flex items-center gap-2 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{t('failedToLoad', { message: error.message })}</span>
        </div>
      </Layout>
    );
  }

  if (fetching || !course) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-muted-foreground p-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('loadingCourse')}</span>
        </div>
      </Layout>
    );
  }

  const totalItems = course.modules.reduce((n, m) => n + m.contentItems.length, 0);

  return (
    <Layout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/courses')}>
          <ArrowLeft className="h-4 w-4" />
          {t('backToCourses')}
        </Button>

        {/* Course header card */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <span className="text-5xl">{course.thumbnailUrl ?? '📚'}</span>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl leading-snug mb-2">{course.title}</CardTitle>
                {course.description && (
                  <p className="text-muted-foreground text-sm">{course.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  {course.estimatedHours != null && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {course.estimatedHours}h estimated
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {t('itemsInModules', { items: totalItems, modules: course.modules.length })}
                  </span>
                  {isEnrolled && progress && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <Users className="h-4 w-4" />
                      {t('percentComplete', { percent: progress.percentComplete })}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={isEnrolled ? 'secondary' : 'default'}
                className="shrink-0 gap-2"
                onClick={handleEnroll}
                disabled={isEnrolling}
              >
                {isEnrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEnrolling ? (isEnrolled ? t('unenrolling') : t('enrolling')) : (isEnrolled ? t('unenroll') : t('enroll'))}
              </Button>
            </div>
          </CardHeader>

          {/* Progress bar */}
          {isEnrolled && progress && progress.totalItems > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('completedOfTotal', { completed: progress.completedItems, total: progress.totalItems })}</span>
                  <span>{progress.percentComplete}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-primary rounded-full transition-all"
                    style={{ width: `${progress.percentComplete}%` }}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Module list */}
        <CourseModuleList modules={course.modules} courseId={courseId} />

        {/* Knowledge Sources — collapsible panel */}
        <div className="border rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
            data-testid="toggle-sources"
          >
            <span className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-blue-600" />
              מקורות מידע
            </span>
            <span className="text-gray-400">{showSources ? '▲' : '▼'}</span>
          </button>
          {showSources && (
            <div className="h-96" data-testid="sources-panel">
              <SourceManager courseId={courseId} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
