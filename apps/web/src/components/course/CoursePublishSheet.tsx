/**
 * CoursePublishSheet — slide-in panel showing course readiness checks
 * with publish confirmation dialog.
 */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'urql';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
} from 'lucide-react';
import {
  COURSE_READINESS_QUERY,
  PUBLISH_COURSE_MUTATION,
} from '@/lib/graphql/content.queries';

interface ReadinessCheck {
  name: string;
  passed: boolean;
  message: string | null;
}

interface CourseReadinessData {
  courseReadiness: {
    ready: boolean;
    checks: ReadinessCheck[];
  };
}

interface PublishResult {
  publishCourse: { id: string; isPublished: boolean };
}

const CHECK_LABELS: Record<string, string> = {
  has_title: 'כותרת קורס',
  has_description: 'תיאור קורס',
  has_lessons: 'לפחות שיעור אחד',
  lessons_ready: 'כל השיעורים מוכנים',
  has_pipeline_results: 'תוצאות Pipeline',
};

interface Props {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
}

export const CoursePublishSheet: React.FC<Props> = ({
  courseId,
  open,
  onOpenChange,
  onPublished,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [readinessResult] = useQuery<CourseReadinessData>({
    query: COURSE_READINESS_QUERY,
    variables: { courseId },
    pause: !open,
  });

  const [publishResult, publishCourse] = useMutation<PublishResult>(
    PUBLISH_COURSE_MUTATION
  );

  const handlePublish = useCallback(async () => {
    setConfirmOpen(false);
    const result = await publishCourse({ id: courseId });
    if (!result.error) {
      onPublished();
      onOpenChange(false);
    }
  }, [courseId, publishCourse, onPublished, onOpenChange]);

  const readiness = readinessResult.data?.courseReadiness;
  const isLoading = readinessResult.fetching;
  const isPublishing = publishResult.fetching;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="fixed right-0 top-0 h-full w-full max-w-md translate-x-0 translate-y-0 left-auto rounded-none sm:rounded-l-lg data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
          data-testid="publish-sheet"
        >
          <DialogHeader>
            <DialogTitle>פרסום קורס</DialogTitle>
            <DialogDescription>
              בדוק שכל התנאים מתקיימים לפני פרסום
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4" role="list" aria-label="readiness checks">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {readiness?.checks.map((check) => (
              <div
                key={check.name}
                role="listitem"
                className="flex items-center gap-3 rounded-md border p-3"
                data-testid={`check-${check.name}`}
              >
                {check.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {CHECK_LABELS[check.name] ?? check.name}
                  </span>
                  {!check.passed && check.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {check.message}
                    </p>
                  )}
                </div>
                <Badge variant={check.passed ? 'default' : 'destructive'}>
                  {check.passed ? 'עבר' : 'נכשל'}
                </Badge>
              </div>
            ))}
          </div>

          {publishResult.error && (
            <p className="text-sm text-destructive" role="alert">
              {publishResult.error.message}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">סגור</Button>
            </DialogClose>
            <Button
              disabled={!readiness?.ready || isPublishing}
              onClick={() => setConfirmOpen(true)}
              className="gap-2"
              data-testid="publish-btn"
            >
              {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              פרסם קורס
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-testid="publish-confirm-dialog">
          <DialogHeader>
            <DialogTitle>אישור פרסום</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך לפרסם את הקורס? הקורס יהיה נגיש לכל
              המשתמשים.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              data-testid="confirm-publish-btn"
            >
              {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              אשר פרסום
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
