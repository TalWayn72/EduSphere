import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ImportJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
  lessonCount: number;
  estimatedMinutes: number | null;
}

interface Props {
  job: ImportJob;
  onDone: () => void;
}

export function ImportProgressPanel({ job, onDone }: Props) {
  const isDone = job.status === 'COMPLETE' || job.status === 'FAILED' || job.status === 'CANCELLED';

  return (
    <div
      className="rounded-xl border p-8 text-center space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Import progress"
    >
      {job.status === 'COMPLETE' && (
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" aria-hidden="true" />
      )}
      {job.status === 'FAILED' && (
        <XCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden="true" />
      )}
      {(job.status === 'PENDING' || job.status === 'RUNNING') && (
        <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" aria-hidden="true" />
      )}

      <div>
        <p className="text-lg font-semibold">
          {job.status === 'COMPLETE' && `Import complete — ${job.lessonCount} lessons imported`}
          {job.status === 'FAILED' && 'Import failed'}
          {job.status === 'CANCELLED' && 'Import cancelled'}
          {job.status === 'PENDING' && 'Preparing import…'}
          {job.status === 'RUNNING' && `Importing ${job.lessonCount} lessons…`}
        </p>
        {job.estimatedMinutes && !isDone && (
          <p className="text-sm text-muted-foreground mt-1">
            Estimated time: ~{job.estimatedMinutes} minute{job.estimatedMinutes !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {isDone && (
        <button
          onClick={onDone}
          className="bg-primary text-primary-foreground px-6 py-2 rounded font-medium"
        >
          {job.status === 'COMPLETE' ? 'View Course' : 'Back to Course'}
        </button>
      )}
    </div>
  );
}
