/**
 * PipelineRunStatus — bottom panel showing active/completed run status and results.
 */

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

export function PipelineRunStatus({ run, onCancel }: Props) {
  const colorClass =
    STATUS_COLOR[run.status] ?? 'bg-muted border-border text-muted-foreground';
  const statusLabel = STATUS_LABEL[run.status] ?? run.status;

  const summary = extractOutput(run.results, 'SUMMARIZATION', 'shortSummary') as string | null;
  const notes = extractOutput(run.results, 'STRUCTURED_NOTES', 'outputMarkdown') as string | null;
  const qaScore = extractOutput(run.results, 'QA_GATE', 'qaScore') as number | null;
  const transcript = extractOutput(run.results, 'ASR', 'transcript') as string | null;

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
              className="underline text-red-600 hover:text-red-800"
              data-testid="cancel-run-btn"
            >
              ביטול
            </button>
          )}
        </div>
      </div>

      {/* Module results pills */}
      {run.results.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {run.results.map((r) => (
            <span
              key={r.id}
              className="text-xs px-2 py-0.5 rounded-full bg-card border"
            >
              ✓ {r.moduleName}
            </span>
          ))}
        </div>
      )}

      {/* Key outputs */}
      {run.status === 'COMPLETED' && (
        <div className="space-y-2 text-xs">
          {summary && (
            <ResultBlock title="סיכום" content={String(summary)} testId="result-summary" />
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
              content={String(transcript).slice(0, 300) + (String(transcript).length > 300 ? '...' : '')}
              testId="result-transcript"
            />
          )}
          {notes && (
            <ResultBlock
              title="הערות מובנות"
              content={String(notes).slice(0, 400) + (String(notes).length > 400 ? '...' : '')}
              testId="result-notes"
            />
          )}
          {!summary && !transcript && !notes && (
            <p className="text-muted-foreground">Pipeline הסתיים. חזור לשיעור לצפייה בתוצאות.</p>
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
        <p className="mt-0.5 text-foreground whitespace-pre-line leading-relaxed">{content}</p>
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
    (r) => r.moduleName === moduleName || r.moduleName === moduleName.toLowerCase()
  );
  if (!result?.outputData) return null;
  return (result.outputData as Record<string, unknown>)[key] ?? null;
}
