/**
 * PipelineStepperSkeleton — loading placeholder for the PipelineStepper.
 * Shows 6 skeleton rows matching the stepper layout.
 */
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_ROWS = 6;

export function PipelineStepperSkeleton() {
  return (
    <div
      dir="rtl"
      className="space-y-1"
      data-testid="pipeline-stepper-skeleton"
      aria-busy="true"
      aria-label="טוען סטטוס צנרת..."
    >
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div
          key={i}
          className="border rounded-lg px-3 py-2 flex items-center gap-2"
        >
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-4 flex-1 max-w-[160px]" />
          <Skeleton className="h-3 w-12 ms-auto" />
        </div>
      ))}
    </div>
  );
}
