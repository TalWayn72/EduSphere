/**
 * DeleteCourseButton — wrapper button that manages the DeleteCourseDialog open/close state.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteCourseDialog } from './DeleteCourseDialog';

interface DeleteCourseButtonProps {
  courseId: string;
  courseTitle: string;
  isPublished: boolean;
  onDeleted: () => void;
}

export function DeleteCourseButton({
  courseId,
  courseTitle,
  isPublished,
  onDeleted,
}: DeleteCourseButtonProps) {
  const { t } = useTranslation('courses');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
        data-testid="delete-course-btn"
        aria-label={t('deleteCourse')}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t('deleteCourse')}
      </Button>
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
