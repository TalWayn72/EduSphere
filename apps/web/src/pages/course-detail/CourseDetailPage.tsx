/**
 * CourseDetailPage — shows course overview, module list, and content items.
 * Route: /courses/:courseId
 *
 * Thin orchestrator: delegates to sub-components and useCourseDetailQueries hook.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { EDITOR_ROLES } from './types';
import { useCourseDetailQueries } from './useCourseDetailQueries';
import { CourseHeaderCard } from './CourseHeaderCard';
import { CourseLessonsSection } from './CourseLessonsSection';
import { CourseExamsSection } from './CourseExamsSection';
import { CourseSourcesPanel } from './CourseSourcesPanel';
import { CourseModuleList } from '../CourseDetailPage.modules';

export function CourseDetailPage() {
  const { t } = useTranslation('courses');
  const { courseId = '' } = useParams<{ courseId: string }>();
  const currentUser = getCurrentUser();
  const canEdit = currentUser != null && EDITOR_ROLES.has(currentUser.role);

  const {
    course,
    lessons,
    fetching,
    isEnrolled,
    optimisticEnrolled,
    progress,
    toast,
    forkError,
    setForkError,
    isForkingCourse,
    isSavingTitle,
    isEnrolling,
    handleEnroll,
    handleForkCourse,
    handleSaveTitle,
  } = useCourseDetailQueries(courseId);

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const blocker = useUnsavedChangesGuard(editMode, 'CourseDetailPage');

  const onSaveTitle = async () => {
    const ok = await handleSaveTitle(editTitle);
    if (ok) setEditMode(false);
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

  return (
    <Layout>
      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onLeave={() => blocker.proceed?.()}
        onStay={() => blocker.reset?.()}
      />
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      <PageShell size="md">
        <PageHeader
          title={course.title}
          breadcrumbs={[
            { label: t('backToCourses', 'Courses'), href: '/courses' },
            { label: course.title },
          ]}
        />

        <CourseHeaderCard
          course={course}
          courseId={courseId}
          canEdit={canEdit}
          isEnrolled={isEnrolled}
          optimisticEnrolled={optimisticEnrolled}
          progress={progress}
          isEnrolling={isEnrolling}
          isForkingCourse={isForkingCourse}
          isSavingTitle={isSavingTitle}
          forkError={forkError}
          editMode={editMode}
          editTitle={editTitle}
          onEditModeChange={setEditMode}
          onEditTitleChange={setEditTitle}
          onSaveTitle={() => void onSaveTitle()}
          onForkCourse={() => void handleForkCourse()}
          onEnroll={handleEnroll}
          onDismissForkError={() => setForkError(null)}
        />

        <CourseModuleList modules={course.modules} courseId={courseId} />

        <CourseLessonsSection
          courseId={courseId}
          lessons={lessons}
          canEdit={canEdit}
        />

        <CourseExamsSection courseId={courseId} canEdit={canEdit} />

        <CourseSourcesPanel courseId={courseId} />
      </PageShell>
    </Layout>
  );
}
