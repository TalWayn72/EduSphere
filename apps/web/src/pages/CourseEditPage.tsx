/**
 * CourseEditPage — instructor interface for editing an existing course.
 * Route: /courses/:courseId/edit
 *
 * Role guard: INSTRUCTOR (own courses only), ORG_ADMIN, SUPER_ADMIN.
 * Renders two tabs: "Basic Info" (metadata form) and "Modules & Content".
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCurrentUser } from '@/lib/auth';
import { ArrowLeft, Globe, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import {
  COURSE_DETAIL_QUERY,
  PUBLISH_COURSE_MUTATION,
  UNPUBLISH_COURSE_MUTATION,
} from '@/lib/graphql/content.queries';
import { CourseEditMetadata } from './CourseEditPage.metadata';
import { CourseEditModules } from './CourseEditPage.modules';

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
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [toast, setToast] = useState<string | null>(null);
  const [published, setPublished] = useState<boolean | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [{ data, fetching, error }, refetch] = useQuery<CourseDetailResult>({
    query: COURSE_DETAIL_QUERY,
    variables: { id: courseId },
    pause: !courseId,
  });

  const [{ fetching: publishing }, executePublish] = useMutation(PUBLISH_COURSE_MUTATION);
  const [{ fetching: unpublishing }, executeUnpublish] = useMutation(UNPUBLISH_COURSE_MUTATION);

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
      } else if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
        navigate(`/courses/${courseId}`, { replace: true });
      }
    }
  }, [fetching, error, data?.course, user, courseId, navigate]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  const course = data?.course;

  const handleTogglePublish = async () => {
    const isCurrentlyPublished = published ?? course?.isPublished ?? false;
    if (isCurrentlyPublished) {
      const { error: err } = await executeUnpublish({ id: courseId });
      if (err) {
        showToast(`Failed to unpublish: ${err.graphQLErrors?.[0]?.message ?? err.message}`);
      } else {
        setPublished(false);
        showToast('Course unpublished — now draft only');
      }
    } else {
      const { error: err } = await executePublish({ id: courseId });
      if (err) {
        showToast(`Failed to publish: ${err.graphQLErrors?.[0]?.message ?? err.message}`);
      } else {
        setPublished(true);
        showToast('Course published successfully!');
      }
    }
  };

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-muted-foreground p-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading course editor…</span>
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="p-6 text-destructive text-sm">
          {error ? `Error: ${error.message}` : 'Course not found.'}
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

      <div className="max-w-4xl mx-auto space-y-6">
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
              Back
            </Button>
            <h1 className="text-xl font-semibold truncate">{course.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isCurrentlyPublished ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
              {isCurrentlyPublished ? 'Published' : 'Draft'}
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
            {isCurrentlyPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Basic Info</TabsTrigger>
            <TabsTrigger value="modules">Modules &amp; Content</TabsTrigger>
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
        </Tabs>
      </div>
    </Layout>
  );
}
