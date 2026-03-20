/**
 * CourseEditPage — instructor interface for editing an existing course.
 * Route: /courses/:courseId/edit
 *
 * Role guard: INSTRUCTOR (own courses only), ORG_ADMIN, SUPER_ADMIN.
 * Renders two tabs: "Basic Info" (metadata form) and "Modules & Content".
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { SAVED_CONFIRMATION_MS } from '@/lib/constants';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCurrentUser } from '@/lib/auth';
import { ArrowLeft, Globe, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  COURSE_DETAIL_QUERY,
  PUBLISH_COURSE_MUTATION,
  UNPUBLISH_COURSE_MUTATION,
} from '@/lib/graphql/content.queries';
import { CourseEditMetadata } from './CourseEditPage.metadata';
import { CourseEditModules } from './CourseEditPage.modules';
import { SourceManager } from '@/components/SourceManager';
import { PageShell } from '@/components/PageShell';

const EDITOR_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR']);

interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  isPublished: boolean;
  instructorId: string;
  modules: Array<{
    id: string;
    title: string;
    description?: string | null;
    orderIndex: number;
    contentItems: Array<{
      id: string;
      title: string;
      contentType: string;
      orderIndex: number;
    }>;
  }>;
}

interface CourseDetailResult {
  course: CourseDetailData | null;
}

export function CourseEditPage() {
  const { t } = useTranslation('courses');
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [toast, setToast] = useState<string | null>(null);
  const [published, setPublished] = useState<boolean | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Mounted guard: prevent urql cache dispatch during sibling route render
  // (CourseDetailPage / CourseEditPage / CourseAnalyticsPage share /courses/:courseId).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching, error }, refetch] = useQuery<CourseDetailResult>({
    query: COURSE_DETAIL_QUERY,
    variables: { id: courseId },
    pause: !mounted || !courseId,
    requestPolicy: 'network-only',
  });

  const [{ fetching: publishing }, executePublish] = useMutation(
    PUBLISH_COURSE_MUTATION
  );
  const [{ fetching: unpublishing }, executeUnpublish] = useMutation(
    UNPUBLISH_COURSE_MUTATION
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    };
  }, []);

  // Sync local publish state from server
  useEffect(() => {
    if (data?.course != null) {
      setPublished(data.course.isPublished);
    }
  }, [data?.course]);

  // Role guard — redirect non-editors (must be in useEffect, not render body)
  useEffect(() => {
    const course = data?.course;
    if (!fetching && !error && course) {
      if (!user || !EDITOR_ROLES.has(user.role)) {
        navigate(`/courses/${courseId}`, { replace: true });
      } else if (
        user.role === 'INSTRUCTOR' &&
        course.instructorId !== user.id
      ) {
        navigate(`/courses/${courseId}`, { replace: true });
      }
    }
  }, [fetching, error, data?.course, user, courseId, navigate]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), SAVED_CONFIRMATION_MS);
  };

  const course = data?.course;

  const handleTogglePublish = async () => {
    const isCurrentlyPublished = published ?? course?.isPublished ?? false;
    if (isCurrentlyPublished) {
      const { error: err } = await executeUnpublish({ id: courseId });
      if (err) {
        showToast(
          t('failedToUnpublish', { message: err.graphQLErrors?.[0]?.message ?? err.message })
        );
      } else {
        setPublished(false);
        showToast(t('unpublishedToast'));
      }
    } else {
      const { error: err } = await executePublish({ id: courseId });
      if (err) {
        showToast(
          t('failedToPublish', { message: err.graphQLErrors?.[0]?.message ?? err.message })
        );
      } else {
        setPublished(true);
        showToast(t('publishedToast'));
      }
    }
  };

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-muted-foreground p-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('loadingEditor')}</span>
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="p-6 text-destructive text-sm">
          {error ? t('failedToLoadCourse') : t('courseNotFound')}
        </div>
      </Layout>
    );
  }

  const isCurrentlyPublished = published ?? course.isPublished;
  const isToggling = publishing || unpublishing;

  return (
    <Layout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      <PageShell size="md">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: t('title'), href: '/courses' },
            { label: course.title, href: `/courses/${courseId}` },
            { label: t('edit') },
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => navigate(`/courses/${courseId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('back')}
            </Button>
            <h1 className="text-xl font-semibold truncate">{course.title}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isCurrentlyPublished ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}
            >
              {isCurrentlyPublished ? t('published') : t('draft')}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleTogglePublish}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isCurrentlyPublished ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {isCurrentlyPublished ? t('unpublishCourse') : t('publishCourse')}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">{t('basicInfo')}</TabsTrigger>
            <TabsTrigger value="modules">{t('modulesAndContent')}</TabsTrigger>
            <TabsTrigger value="sources">{t('knowledgeSources')}</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <CourseEditMetadata
              courseId={courseId}
              initialValues={{
                title: course.title,
                description: course.description ?? '',
                estimatedHours: course.estimatedHours ?? undefined,
                thumbnailUrl: course.thumbnailUrl ?? '',
              }}
              onSaved={(msg) => {
                showToast(msg);
                refetch({ requestPolicy: 'network-only' });
              }}
            />
          </TabsContent>

          <TabsContent value="modules" className="mt-4">
            <CourseEditModules
              courseId={courseId}
              modules={course.modules}
              onRefetch={() => refetch({ requestPolicy: 'network-only' })}
              onToast={showToast}
            />
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <div className="h-[500px] border rounded-xl overflow-hidden">
              <SourceManager courseId={courseId} />
            </div>
          </TabsContent>
        </Tabs>
      </PageShell>
    </Layout>
  );
}
