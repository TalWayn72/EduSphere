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
import {
  ENROLL_COURSE_MUTATION,
  UNENROLL_COURSE_MUTATION,
} from '@/lib/graphql/content.queries';
import {
  MY_ENROLLMENTS_QUERY,
  MY_COURSE_PROGRESS_QUERY,
} from '@/lib/graphql/content.queries';
import { LESSONS_BY_COURSE_QUERY } from '@/lib/graphql/lesson.queries';
import { CourseModuleList } from './CourseDetailPage.modules';
import { SourceManager } from '@/components/SourceManager';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  CheckCircle2,
  Loader2,
  Users,
  BookMarked,
  Pencil,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

const EDITOR_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);

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

interface LessonSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  series?: string;
}

interface LessonsByCourseData {
  lessonsByCourse: LessonSummary[];
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

// ── Mock fallback (shown when GraphQL is unavailable / DEV_MODE) ──────────────

const MOCK_COURSE_FALLBACK: CourseDetailData = {
  id: 'cc000000-0000-0000-0000-000000000002',
  title: 'Introduction to Talmud Study',
  description:
    'Learn the fundamentals of Talmudic reasoning and argumentation using AI-powered tools.',
  thumbnailUrl: '📚',
  estimatedHours: 8,
  isPublished: true,
  instructorId: 'instructor-demo',
  modules: [
    {
      id: 'mod-demo-1',
      title: 'Unit 1: Foundations',
      orderIndex: 0,
      contentItems: [
        {
          id: 'ci-demo-1',
          title: 'Introduction Video',
          contentType: 'VIDEO',
          duration: 600,
          orderIndex: 0,
        },
        {
          id: 'ci-demo-2',
          title: 'Reading: Mishnah Overview',
          contentType: 'PDF',
          duration: null,
          orderIndex: 1,
        },
      ],
    },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CourseDetailPage() {
  const { t } = useTranslation('courses');
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const canEdit = currentUser != null && EDITOR_ROLES.has(currentUser.role);

  // Delay all queries until after mount to prevent urql from triggering a
  // synchronous setState on CourseList (which shares MY_ENROLLMENTS_QUERY cache)
  // during CourseDetailPage's render phase — causes React strict-mode warning.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery<CourseDetailResult>({
    query: COURSE_DETAIL_QUERY,
    variables: { id: courseId },
    pause: !courseId || !mounted,
  });

  const [{ data: enrollData, error: enrollError }] = useQuery<EnrollmentData>({
    query: MY_ENROLLMENTS_QUERY,
    pause: !mounted,
  });

  const [{ data: progressData }] = useQuery<ProgressData>({
    query: MY_COURSE_PROGRESS_QUERY,
    variables: { courseId },
    pause: !courseId || !mounted,
  });

  const [{ data: lessonsData }] = useQuery<LessonsByCourseData>({
    query: LESSONS_BY_COURSE_QUERY,
    variables: { courseId, limit: 20 },
    pause: !courseId || !mounted,
  });

  const [, enrollMutation] = useMutation(ENROLL_COURSE_MUTATION);
  const [, unenrollMutation] = useMutation(UNENROLL_COURSE_MUTATION);

  // useTransition keeps the UI interactive (non-blocking) during the
  // enroll/unenroll mutation.  isEnrolling replaces the old useState flag.
  const [isEnrolling, startEnrollTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Fall back to mock data when GraphQL is unavailable (DEV_MODE / no backend)
  const course = data?.course ?? (error ? MOCK_COURSE_FALLBACK : null);
  // When gateway is offline (enrollError) and showing mock course, treat as enrolled
  // so "בטל הרשמה" is shown rather than the misleading "הירשם".
  const isEnrolled = enrollError
    ? true
    : (enrollData?.myEnrollments?.some((e) => e.courseId === courseId) ??
      false);
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

  const totalItems = course.modules.reduce(
    (n, m) => n + m.contentItems.length,
    0
  );

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
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigate('/courses')}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToCourses')}
        </Button>

        {/* Course header card */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <span className="text-5xl">{course.thumbnailUrl ?? '📚'}</span>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl leading-snug mb-2">
                  {course.title}
                </CardTitle>
                {course.description && (
                  <p className="text-muted-foreground text-sm">
                    {course.description}
                  </p>
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
                    {t('itemsInModules', {
                      items: totalItems,
                      modules: course.modules.length,
                    })}
                  </span>
                  {isEnrolled && progress && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <Users className="h-4 w-4" />
                      {t('percentComplete', {
                        percent: progress.percentComplete,
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/courses/${courseId}/edit`)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Course
                  </Button>
                )}
                <Button
                  variant={isEnrolled ? 'secondary' : 'default'}
                  className="gap-2"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEnrolling
                    ? isEnrolled
                      ? t('unenrolling')
                      : t('enrolling')
                    : isEnrolled
                      ? t('unenroll')
                      : t('enroll')}
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Progress bar */}
          {isEnrolled && progress && progress.totalItems > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {t('completedOfTotal', {
                      completed: progress.completedItems,
                      total: progress.totalItems,
                    })}
                  </span>
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

        {/* Lessons section (F-Lesson Pipeline Builder) */}
        {canEdit && (
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
              <span className="text-sm font-medium flex items-center gap-2">
                🎓 שיעורים
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/courses/${courseId}/lessons/new`)}
              >
                + הוסף שיעור
              </Button>
            </div>
            {lessonsData?.lessonsByCourse?.length ? (
              <div className="divide-y">
                {lessonsData.lessonsByCourse.map((lesson) => (
                  <button
                    key={lesson.id}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-sm text-left"
                    onClick={() =>
                      navigate(`/courses/${courseId}/lessons/${lesson.id}`)
                    }
                  >
                    <span className="font-medium">{lesson.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        lesson.status === 'PUBLISHED'
                          ? 'bg-blue-100 text-blue-700'
                          : lesson.status === 'READY'
                            ? 'bg-green-100 text-green-700'
                            : lesson.status === 'PROCESSING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lesson.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                אין שיעורים עדיין — לחץ "+ הוסף שיעור" כדי להתחיל
              </div>
            )}
          </div>
        )}

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
