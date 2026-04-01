/**
 * PipelineRunStatus — bottom panel showing active/completed run status and results.
 * Uses PipelineStepper for in-progress runs, summary view for completed runs.
 */
import { useState } from 'react';
import { PipelineStepper } from './PipelineStepper';
import { PipelineStepperSkeleton } from './PipelineStepperSkeleton';
import { PipelineResultDetail } from './PipelineResultDetail';
import {
  useLessonPipelineStore,
  type PipelineModuleType,
  type ModuleStatusValue,
} from '@/lib/lesson-pipeline.store';

interface PipelineResult {
  id: string;
  moduleName: string;
  outputType: string;
  outputData?: Record<string, unknown> | null;
  fileUrl?: string | null;
}

interface RunData {
  id: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  results: PipelineResult[];
}

interface Props {
  run: RunData;
  onCancel: () => void;
  onRetryModule?: (moduleType: PipelineModuleType) => void;
  onSkipModule?: (moduleType: PipelineModuleType) => void;
  isLoading?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  RUNNING: '⏳ מריץ...',
  COMPLETED: '✅ הושלם',
  FAILED: '❌ נכשל',
  CANCELLED: '⛔ בוטל',
};

const STATUS_COLOR: Record<string, string> = {
  RUNNING: 'bg-blue-50 border-blue-200 text-blue-700',
  COMPLETED: 'bg-green-50 border-green-200 text-green-700',
  FAILED: 'bg-red-50 border-red-200 text-red-700',
  CANCELLED: 'bg-muted border-border text-muted-foreground',
};

export function PipelineRunStatus({
  run,
  onCancel,
  onRetryModule,
  onSkipModule,
  isLoading,
}: Props) {
  const colorClass =
    STATUS_COLOR[run.status] ?? 'bg-muted border-border text-muted-foreground';
  const statusLabel = STATUS_LABEL[run.status] ?? run.status;
  const moduleStatuses = useLessonPipelineStore((s) => s.moduleStatuses);
  const nodes = useLessonPipelineStore((s) => s.nodes);
  const [selectedResult, setSelectedResult] = useState<PipelineResult | null>(
    null
  );

  const summary = extractOutput(
    run.results,
    'SUMMARIZATION',
    'shortSummary'
  ) as string | null;
  const notes = extractOutput(
    run.results,
    'STRUCTURED_NOTES',
    'outputMarkdown'
  ) as string | null;
  const qaScore = extractOutput(run.results, 'QA_GATE', 'qaScore') as
    | number
    | null;
  const transcript = extractOutput(run.results, 'ASR', 'transcript') as
    | string
    | null;

  // Build stepper steps from store nodes + moduleStatuses
  const stepperSteps = nodes
    .filter((n) => n.enabled)
    .map((n) => ({
      moduleType: n.moduleType,
      status: (moduleStatuses[n.moduleType] ?? 'pending') as ModuleStatusValue,
      errorMessage: extractOutput(run.results, n.moduleType, 'errorMessage') as
        | string
        | null,
      output: extractOutput(run.results, n.moduleType, 'outputSummary') as
        | string
        | null,
    }));

  const isRunning = run.status === 'RUNNING' || run.status === 'FAILED';
  const showStepper = isRunning && stepperSteps.length > 0;

  return (
    <div
      className={`border-t px-6 py-3 ${colorClass} max-h-72 overflow-y-auto`}
      data-testid="pipeline-run-status"
    >
      {/* Status row */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" data-testid="run-status-label">
          {statusLabel}
        </span>
        <div className="flex items-center gap-3 text-xs">
          {run.startedAt && (
            <span>
              התחיל:{' '}
              {(() => {
                const d = new Date(run.startedAt);
                return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('he-IL');
              })()}
            </span>
          )}
          {run.status === 'RUNNING' && (
            <button
              onClick={onCancel}
              className="underline text-red-600 hover:text-red-800 dark:text-red-400"
              data-testid="cancel-run-btn"
            >
              ביטול
            </button>
          )}
        </div>
      </div>

      {/* Vertical stepper for in-progress/failed runs */}
      {showStepper && !isLoading && (
        <div className="mb-3">
          <PipelineStepper
            steps={stepperSteps}
            onRetry={onRetryModule}
            onSkip={onSkipModule}
          />
        </div>
      )}
      {showStepper && isLoading && (
        <div className="mb-3">
          <PipelineStepperSkeleton />
        </div>
      )}

      {/* Module results pills for completed runs — clickable to open detail */}
      {!showStepper && run.results.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {run.results.map((r) => (
            <button
              key={r.id}
              className="text-xs px-2 py-0.5 rounded-full bg-card border hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
              onClick={() => setSelectedResult(r)}
              data-testid={`result-pill-${r.moduleName}`}
            >
              {'\u2713'} {r.moduleName}
            </button>
          ))}
        </div>
      )}

      <PipelineResultDetail
        result={selectedResult}
        open={selectedResult !== null}
        onClose={() => setSelectedResult(null)}
      />

      {/* Key outputs */}
      {run.status === 'COMPLETED' && (
        <div className="space-y-2 text-xs">
          {summary && (
            <ResultBlock
              title="סיכום"
              content={String(summary)}
              testId="result-summary"
            />
          )}
          {qaScore != null && (
            <ResultBlock
              title={`ציון איכות: ${String(qaScore)}%`}
              content=""
              testId="result-qa-score"
            />
          )}
          {transcript && (
            <ResultBlock
              title="תמלול (קטע)"
              content={
                String(transcript).slice(0, 300) +
                (String(transcript).length > 300 ? '...' : '')
              }
              testId="result-transcript"
            />
          )}
          {notes && (
            <ResultBlock
              title="הערות מובנות"
              content={
                String(notes).slice(0, 400) +
                (String(notes).length > 400 ? '...' : '')
              }
              testId="result-notes"
            />
          )}
          {!summary && !transcript && !notes && (
            <p className="text-muted-foreground">
              Pipeline הסתיים. חזור לשיעור לצפייה בתוצאות.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultBlock({
  title,
  content,
  testId,
}: {
  title: string;
  content: string;
  testId: string;
}) {
  return (
    <div data-testid={testId}>
      <span className="font-semibold">{title}</span>
      {content && (
        <p className="mt-0.5 text-foreground whitespace-pre-line leading-relaxed">
          {content}
        </p>
      )}
    </div>
  );
}

function extractOutput(
  results: PipelineResult[],
  moduleName: string,
  key: string
): unknown {
  const result = results.find(
    (r) =>
      r.moduleName === moduleName || r.moduleName === moduleName.toLowerCase()
  );
  if (!result?.outputData) return null;
  return (result.outputData as Record<string, unknown>)[key] ?? null;
}
