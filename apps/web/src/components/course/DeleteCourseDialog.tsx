/**
 * DeleteCourseDialog — WCAG-compliant dialog for irreversible course deletion.
 * Uses typed confirmation (course title) to prevent accidents.
 * Accessibility: relies on Radix DialogTitle + DialogDescription for screen readers.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'urql';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { DELETE_COURSE_MUTATION } from '@/lib/graphql/content.queries';

interface DeleteCourseDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  courseId: string;
  courseTitle: string;
  isPublished: boolean;
}

export function DeleteCourseDialog({
  open,
  onClose,
  onDeleted,
  courseId,
  courseTitle,
  isPublished,
}: DeleteCourseDialogProps) {
  const { t } = useTranslation('courses');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isConfirmed = typed === courseTitle;

  const [{ fetching: deleting }, executeDelete] = useMutation(DELETE_COURSE_MUTATION);

  useEffect(() => {
    if (open) {
      setTyped('');
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || deleting) return;

    const { error: mutationError } = await executeDelete({ id: courseId });
    if (mutationError) {
      const msg = mutationError.graphQLErrors?.[0]?.message ?? mutationError.message;
      if (msg?.includes('permission') || msg?.includes('forbidden')) {
        setError(t('deleteCoursePermissionDenied'));
      } else if (msg?.includes('not found')) {
        setError(t('deleteCourseNotFound'));
      } else {
        setError(t('deleteCourseFailed'));
      }
      return;
    }
    // BUG-103: The urql graphcache cacheExchange does not reliably invalidate
    // the courses list after deleteCourse (which returns a scalar boolean, not
    // a Course entity).  Neither cache.invalidate(), reexecuteQuery with
    // network-only, nor client.query with network-only bypass graphcache's
    // normalized cache.  A hard navigation (window.location) guarantees the
    // courses page fetches fresh data from the server.
    window.location.href = '/courses';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="delete-course-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {t('deleteCourseDialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('deleteCourseDialogDescription', { title: courseTitle })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive font-medium">
              {isPublished
                ? t('deleteCourseWarningPublished')
                : t('deleteCourseWarningDraft')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-course-confirm-input">
              {t('deleteCourseConfirmLabel', { title: courseTitle })}
            </Label>
            <Input
              ref={inputRef}
              id="delete-course-confirm-input"
              data-testid="delete-course-confirm-input"
              aria-describedby="delete-course-confirm-hint"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={courseTitle}
              className="font-mono"
            />
            <p
              id="delete-course-confirm-hint"
              className="text-xs text-muted-foreground"
            >
              {isConfirmed
                ? t('deleteCourseConfirmMatched')
                : t('deleteCourseConfirmHint')}
            </p>
          </div>

          {error && (
            <div role="alert" className="text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={deleting}
              data-testid="delete-course-cancel-btn"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isConfirmed || deleting}
              data-testid="delete-course-confirm-btn"
              aria-disabled={!isConfirmed || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  {t('deletingCourse')}
                </>
              ) : (
                t('deleteCourseConfirm')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
