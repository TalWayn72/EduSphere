/**
 * DeleteCourseButton — wrapper button that manages the DeleteCourseDialog open/close state.
 * When canDelete=false the button is disabled and a tooltip explains why.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeleteCourseDialog } from './DeleteCourseDialog';

interface DeleteCourseButtonProps {
  courseId: string;
  courseTitle: string;
  isPublished: boolean;
  onDeleted: () => void;
  /** When false the button is disabled with a tooltip explaining the restriction. */
  canDelete?: boolean;
}

export function DeleteCourseButton({
  courseId,
  courseTitle,
  isPublished,
  onDeleted,
  canDelete = true,
}: DeleteCourseButtonProps) {
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);

  const button = (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => canDelete && setOpen(true)}
      disabled={!canDelete}
      data-testid="delete-course-btn"
      aria-label={t('deleteCourse')}
      aria-disabled={!canDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {t('deleteCourse')}
    </Button>
  );

  return (
    <>
      {canDelete ? (
        button
      ) : (
        <TooltipProvider>
          <Tooltip>
            {/* asChild on a disabled button won't forward events — wrap in span */}
            <TooltipTrigger asChild>
              <span data-testid="delete-course-btn-wrapper" tabIndex={0}>
                {button}
              </span>
            </TooltipTrigger>
            <TooltipContent>{t('deleteCourseNoPermission')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <DeleteCourseDialog
        open={open}
        onClose={() => setOpen(false)}
        onDeleted={() => {
          setOpen(false);
          onDeleted();
        }}
        courseId={courseId}
        courseTitle={courseTitle}
        isPublished={isPublished}
      />
    </>
  );
}
