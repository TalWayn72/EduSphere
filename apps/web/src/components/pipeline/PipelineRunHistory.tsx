/**
 * PipelineRunHistory — dropdown to browse and restore past pipeline runs.
 */
import { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LESSON_PIPELINE_RUNS_QUERY } from '@/lib/graphql/lesson.queries';

interface PipelineRunResult {
  id: string;
  moduleName: string;
  outputType: string;
}

interface PipelineRun {
  id: string;
  runNumber: number;
  status: string;
  triggeredBy: string;
  completedAt: string | null;
  results: PipelineRunResult[];
}

interface RunHistoryData {
  lessonPipelineRuns: PipelineRun[];
}

interface PipelineRunHistoryProps {
  lessonId: string;
  onRestore?: (run: PipelineRun) => void;
}

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'הושלם',
  FAILED: 'נכשל',
  RUNNING: 'פעיל',
  CANCELLED: 'בוטל',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PipelineRunHistory({
  lessonId,
  onRestore,
}: PipelineRunHistoryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const [{ data, fetching }] = useQuery<RunHistoryData>({
    query: LESSON_PIPELINE_RUNS_QUERY,
    variables: { lessonId, limit: 20 },
    pause: !mounted || !lessonId,
  });

  const runs = data?.lessonPipelineRuns ?? [];
  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  if (!mounted || fetching) {
    return (
      <Skeleton className="h-10 w-56" data-testid="run-history-skeleton" />
    );
  }

  if (runs.length === 0) {
    return (
      <span
        className="text-xs text-muted-foreground"
        data-testid="run-history-empty"
      >
        אין היסטוריית הרצות
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid="run-history">
      <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        היסטוריית הרצות:
      </label>
      <Select value={selectedRunId} onValueChange={setSelectedRunId}>
        <SelectTrigger className="w-56 h-8 text-xs" aria-label="בחר הרצה קודמת">
          <SelectValue placeholder="בחר הרצה..." />
        </SelectTrigger>
        <SelectContent>
          {runs.map((run) => (
            <SelectItem key={run.id} value={run.id}>
              #{run.runNumber} — {STATUS_LABELS[run.status] ?? run.status} —{' '}
              {formatDate(run.completedAt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedRun && onRestore && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onRestore(selectedRun)}
          data-testid="restore-run-btn"
        >
          שחזר
        </Button>
      )}
    </div>
  );
}
