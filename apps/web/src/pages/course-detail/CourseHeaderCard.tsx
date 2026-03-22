/**
 * CourseHeaderCard — course thumbnail, title (editable), metadata, enroll/fork buttons.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  BookOpen,
  Users,
  Pencil,
  GitFork,
  Loader2,
  Send,
} from 'lucide-react';
import type { CourseDetailData } from './types';
import { EDITOR_ROLES } from './types';
import { CoursePublishSheet } from '@/components/course/CoursePublishSheet';
import { DeleteCourseButton } from '@/components/course/DeleteCourseButton';
import { useAuthRole } from '@/hooks/useAuthRole';

interface Props {
  course: CourseDetailData;
  courseId: string;
  canEdit: boolean;
  isEnrolled: boolean;
  optimisticEnrolled: boolean;
  progress: { totalItems: number; completedItems: number; percentComplete: number } | undefined;
  isEnrolling: boolean;
  isForkingCourse: boolean;
  isSavingTitle: boolean;
  forkError: string | null;
  editMode: boolean;
  editTitle: string;
  onEditModeChange: (editing: boolean) => void;
  onEditTitleChange: (title: string) => void;
  onSaveTitle: () => void;
  onForkCourse: () => void;
  onEnroll: () => void;
  onDismissForkError: () => void;
}

export const CourseHeaderCard = React.memo(function CourseHeaderCard({
  course,
  courseId,
  canEdit,
  isEnrolled,
  optimisticEnrolled,
  progress,
  isEnrolling,
  isForkingCourse,
  isSavingTitle,
  forkError,
  editMode,
  editTitle,
  onEditModeChange,
  onEditTitleChange,
  onSaveTitle,
  onForkCourse,
  onEnroll,
  onDismissForkError,
}: Props) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const role = useAuthRole();
  const [publishOpen, setPublishOpen] = useState(false);
  const canPublish = canEdit && !course.isPublished && EDITOR_ROLES.has(role ?? '');
  const handlePublished = useCallback(() => {
    // Force parent to re-fetch course data after publish
    window.location.reload();
  }, []);
  const progressBarStyle = useMemo(
    () => progress ? { width: `${progress.percentComplete}%` } : undefined,
    [progress],
  );
  const totalItems = course.modules.reduce(
    (n, m) => n + m.contentItems.length,
    0
  );

  return (
    <>
      {forkError && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="fork-error-banner"
          className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive"
        >
          <span>{t('forkError', 'Failed to fork course')}</span>
          <button
            className="ml-auto text-xs underline"
            onClick={onDismissForkError}
          >
            {t('dismiss', 'Dismiss')}
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <span className="text-5xl">{course.thumbnailUrl ?? '📚'}</span>
            <div className="flex-1 min-w-0">
              {editMode ? (
                <input
                  data-testid="course-title-input"
                  className="text-2xl font-bold border-b-2 border-blue-400 outline-none w-full bg-transparent leading-snug mb-2 dark:border-blue-500"
                  value={editTitle}
                  onChange={(e) => onEditTitleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveTitle();
                    if (e.key === 'Escape') onEditModeChange(false);
                  }}
                  autoFocus
                />
              ) : (
                <CardTitle className="text-2xl leading-snug mb-2">
                  {course.title}
                </CardTitle>
              )}
              {course.description && (
                <p className="text-muted-foreground text-sm">
                  {course.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {course.estimatedHours != null && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {t('hoursEstimated', { hours: course.estimatedHours })}
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
              {canEdit && !editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-testid="edit-course-btn"
                  onClick={() => {
                    onEditTitleChange(course.title);
                    onEditModeChange(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('editCourse')}
                </Button>
              )}
              {canEdit && editMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditModeChange(false)}
                    data-testid="cancel-edit-btn"
                  >
                    {t('cancelEdit')}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    data-testid="save-course-btn"
                    onClick={onSaveTitle}
                    disabled={isSavingTitle}
                  >
                    {isSavingTitle && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {t('saveTitle')}
                  </Button>
                </>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-testid="fork-course-btn"
                  onClick={onForkCourse}
                  disabled={isForkingCourse}
                >
                  {isForkingCourse ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <GitFork className="h-3.5 w-3.5" />
                  )}
                  {t('forkCourse', 'Fork Course')}
                </Button>
              )}
              {canPublish && (
                <Button
                  size="sm"
                  className="gap-2"
                  data-testid="publish-course-btn"
                  onClick={() => setPublishOpen(true)}
                >
                  <Send className="h-3.5 w-3.5" />
                  {t('publishCourse', 'פרסם קורס')}
                </Button>
              )}
              {canEdit && (
                <DeleteCourseButton
                  courseId={courseId}
                  courseTitle={course.title}
                  isPublished={course.isPublished}
                  onDeleted={() => navigate('/courses', {
                    replace: true,
                    state: { deleted: true, message: t('courseDeletedSuccess', { title: course.title }) },
                  })}
                />
              )}
              <Button
                variant={optimisticEnrolled ? 'secondary' : 'default'}
                className="gap-2"
                onClick={onEnroll}
                disabled={isEnrolling}
                data-testid="enroll-button"
              >
                {isEnrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEnrolling
                  ? optimisticEnrolled
                    ? t('unenrolling')
                    : t('enrolling')
                  : optimisticEnrolled
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
                  style={progressBarStyle}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {canPublish && (
        <CoursePublishSheet
          courseId={courseId}
          open={publishOpen}
          onOpenChange={setPublishOpen}
          onPublished={handlePublished}
        />
      )}
    </>
  );
});
