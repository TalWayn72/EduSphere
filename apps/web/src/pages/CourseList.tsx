import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Clock,
  Users,
  Plus,
  Globe,
  EyeOff,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { COURSES_QUERY } from '@/lib/queries';
import {
  MY_ENROLLMENTS_QUERY,
  ENROLL_COURSE_MUTATION,
  UNENROLL_COURSE_MUTATION,
} from '@/lib/graphql/content.queries';
import { AiCourseCreatorModal } from '@/components/AiCourseCreatorModal';

const INSTRUCTOR_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);

interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  thumbnailUrl: string | null;
  instructorId: string;
  isPublished: boolean;
  estimatedHours: number | null;
}

// ─── Mock fallback data (shown when GraphQL is unavailable) ───────────────────
const MOCK_COURSES_FALLBACK: CourseItem[] = [
  {
    id: 'mock-course-1',
    title: 'Introduction to Talmud Study',
    description:
      'Learn the fundamentals of Talmudic reasoning and argumentation',
    slug: 'intro-talmud',
    thumbnailUrl: '📚',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 8,
  },
  {
    id: 'mock-course-2',
    title: 'Advanced Chavruta Techniques',
    description:
      'Master the art of collaborative Talmud learning with AI assistance',
    slug: 'advanced-chavruta',
    thumbnailUrl: '🤝',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 6,
  },
  {
    id: 'mock-course-3',
    title: 'Knowledge Graph Navigation',
    description:
      'Explore interconnected concepts in Jewish texts using graph-based learning',
    slug: 'knowledge-graph',
    thumbnailUrl: '🕸️',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 4,
  },
  {
    id: 'mock-course-4',
    title: 'Jewish Philosophy: Rambam & Ramban',
    description:
      'A comparative study of Maimonides and Nachmanides on faith and reason',
    slug: 'jewish-philosophy',
    thumbnailUrl: '🔭',
    instructorId: 'instructor-demo',
    isPublished: true,
    estimatedHours: 10,
  },
];

function OfflineBanner({
  message,
  cachedLabel,
}: {
  message: string;
  cachedLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-md">
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      {message} — {cachedLabel}
    </div>
  );
}

interface UserEnrollment {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
}

interface CoursesQueryResult {
  courses: CourseItem[];
}

interface MyEnrollmentsResult {
  myEnrollments: UserEnrollment[];
}

export function CourseList() {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const isInstructor = user ? INSTRUCTOR_ROLES.has(user.role) : false;

  const [{ data, fetching, error }] = useQuery<CoursesQueryResult>({
    query: COURSES_QUERY,
    variables: { limit: 50, offset: 0 },
  });

  const [{ data: enrollmentsData }, reexecuteEnrollments] =
    useQuery<MyEnrollmentsResult>({
      query: MY_ENROLLMENTS_QUERY,
      pause: DEV_MODE,
    });

  const [, executeEnroll] = useMutation<
    { enrollCourse: UserEnrollment },
    { courseId: string }
  >(ENROLL_COURSE_MUTATION);

  const [, executeUnenroll] = useMutation<
    { unenrollCourse: boolean },
    { courseId: string }
  >(UNENROLL_COURSE_MUTATION);

  const [localPublishState, setLocalPublishState] = useState<
    Map<string, boolean>
  >(new Map());
  const [toast, setToast] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Show success message from CourseCreatePage navigation state
  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      showToast(state.message);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
  };

  const enrolledCourseIds = new Set(
    (enrollmentsData?.myEnrollments ?? [])
      .filter((e) => e.status === 'ACTIVE')
      .map((e) => e.courseId)
  );

  const handleEnroll = async (
    e: React.MouseEvent,
    courseId: string,
    title: string
  ) => {
    e.stopPropagation();
    const alreadyEnrolled = enrolledCourseIds.has(courseId);

    if (alreadyEnrolled) {
      const { error } = await executeUnenroll({ courseId });
      if (error) {
        showToast(
          `Failed to unenroll: ${error.graphQLErrors?.[0]?.message ?? error.message}`
        );
      } else {
        showToast(`Unenrolled from "${title}"`);
        reexecuteEnrollments({ requestPolicy: 'network-only' });
      }
    } else {
      const { error } = await executeEnroll({ courseId });
      if (error) {
        showToast(
          `Failed to enroll: ${error.graphQLErrors?.[0]?.message ?? error.message}`
        );
      } else {
        showToast(`Enrolled in "${title}"!`);
        reexecuteEnrollments({ requestPolicy: 'network-only' });
      }
    }
  };

  const togglePublish = (
    e: React.MouseEvent,
    courseId: string,
    current: boolean
  ) => {
    e.stopPropagation();
    setLocalPublishState((prev) => new Map(prev).set(courseId, !current));
  };

  const isPublished = (course: CourseItem): boolean =>
    localPublishState.has(course.id)
      ? (localPublishState.get(course.id) as boolean)
      : course.isPublished;

  // On error, fall back to mock courses so the page remains functional
  const allCourses = error ? MOCK_COURSES_FALLBACK : (data?.courses ?? []);

  return (
    <Layout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      <div className="space-y-6">
        {error && (
          <OfflineBanner
            message={`[Network] Failed to fetch — ${error.message}`}
            cachedLabel={t('showingCachedData')}
          />
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground">{t('exploreCollection')}</p>
          </div>
          {isInstructor && (
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setAiModalOpen(true)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI Create Course
              </Button>
              <Button
                onClick={() => navigate('/courses/new')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('newCourse')}
              </Button>
            </div>
          )}
        </div>

        {fetching && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('loadingCourses')}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allCourses.map((course) => {
            const published = isPublished(course);
            const isEnrolled = enrolledCourseIds.has(course.id);
            return (
              <Card
                key={course.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group relative"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                {isInstructor && !published && (
                  <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                    {t('draft')}
                  </div>
                )}
                {!isInstructor && isEnrolled && (
                  <div className="absolute top-3 right-3 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                    {t('enrolled')}
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-4xl">
                      {course.thumbnailUrl ?? '📚'}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/courses/${course.id}`);
                      }}
                    >
                      {t('open')}
                    </Button>
                  </div>
                  <CardTitle className="text-xl leading-snug">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {course.estimatedHours != null && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>
                          {t('hoursEstimated', {
                            hours: course.estimatedHours,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate font-mono text-xs">
                        {course.instructorId}
                      </span>
                    </div>

                    {!isInstructor && (
                      <Button
                        variant={isEnrolled ? 'secondary' : 'default'}
                        size="sm"
                        className="w-full mt-1 gap-1.5"
                        onClick={(e) =>
                          handleEnroll(e, course.id, course.title)
                        }
                      >
                        {isEnrolled ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            {t('enrolled')}
                          </>
                        ) : (
                          t('enroll')
                        )}
                      </Button>
                    )}

                    {isInstructor && (
                      <div className="flex gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courses/${course.id}`);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={(e) =>
                            togglePublish(e, course.id, published)
                          }
                        >
                          {published ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              {t('unpublishCourse')}
                            </>
                          ) : (
                            <>
                              <Globe className="h-3.5 w-3.5" />
                              {t('publishCourse')}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!fetching && allCourses.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('noCoursesYet')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <AiCourseCreatorModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </Layout>
  );
}
