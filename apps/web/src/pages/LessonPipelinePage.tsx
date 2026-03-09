/**
 * LessonPipelinePage — drag-drop pipeline builder for a lesson.
 * Route: /courses/:courseId/lessons/:lessonId/pipeline
 *
 * Layout: [palette | canvas | config panel] + [run results below]
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
  LESSON_QUERY,
  SAVE_LESSON_PIPELINE_MUTATION,
  START_PIPELINE_RUN_MUTATION,
  CANCEL_PIPELINE_RUN_MUTATION,
} from '@/lib/graphql/lesson.queries';
import {
  useLessonPipelineStore,
  MODULE_LABELS,
  type PipelineModuleType,
  type PipelineNode,
} from '@/lib/lesson-pipeline.store';
import { PipelineConfigPanel } from '@/components/pipeline/PipelineConfigPanel';
import { PipelineRunStatus } from '@/components/pipeline/PipelineRunStatus';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';

const ALL_MODULES: PipelineModuleType[] = [
  'INGESTION', 'ASR', 'NER_SOURCE_LINKING', 'CONTENT_CLEANING',
  'SUMMARIZATION', 'STRUCTURED_NOTES', 'DIAGRAM_GENERATOR',
  'CITATION_VERIFIER', 'QA_GATE', 'PUBLISH_SHARE',
];

interface LessonAsset { id: string; assetType: string; sourceUrl?: string | null; fileUrl?: string | null; }
interface PipelineRun { id: string; status: string; startedAt?: string | null; completedAt?: string | null; results: { id: string; moduleName: string; outputType: string; outputData?: Record<string, unknown> | null; fileUrl?: string | null }[]; }
interface LessonQueryData {
  lesson: { id: string; title: string; assets: LessonAsset[]; pipeline?: { id: string; nodes: PipelineNode[]; status: string; currentRun?: PipelineRun | null } | null } | null;
}

export function LessonPipelinePage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { nodes, isDirty, selectedNodeId, addNode, removeNode, reorderNodes, setSelectedNode, setNodes, loadTemplate, clearNodes, resetDirty } = useLessonPipelineStore();
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const blocker = useUnsavedChangesGuard(isDirty, 'LessonPipelinePage');

  // Defer query to prevent urql cache race with concurrently-unmounting siblings
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, error: lessonError }, reexecute] = useQuery<LessonQueryData>({
    query: LESSON_QUERY, variables: { id: lessonId }, pause: !mounted || !lessonId,
  });

  // Log query errors in useEffect (side effects must NOT be in render body)
  useEffect(() => {
    if (lessonError) console.error('[LessonPipelinePage] query error:', lessonError.message);
  }, [lessonError]);

  const [{ fetching: saving }, savePipeline] = useMutation(SAVE_LESSON_PIPELINE_MUTATION);
  const [{ fetching: starting }, startRun] = useMutation(START_PIPELINE_RUN_MUTATION);
  const [, cancelRun] = useMutation(CANCEL_PIPELINE_RUN_MUTATION);

  // Load saved pipeline nodes into store
  useEffect(() => {
    const savedNodes = data?.lesson?.pipeline?.nodes;
    if (Array.isArray(savedNodes) && savedNodes.length > 0) { setNodes(savedNodes); resetDirty(); }
  }, [data?.lesson?.pipeline, setNodes, resetDirty]);

  // Poll every 3 s while a run is active
  useEffect(() => {
    const status = data?.lesson?.pipeline?.currentRun?.status;
    if (status === 'RUNNING') {
      const t = setTimeout(() => reexecute({ requestPolicy: 'network-only' }), 3000);
      return () => clearTimeout(t);
    }
  }, [data?.lesson?.pipeline?.currentRun?.status, reexecute]);

  const [customMode, setCustomMode] = useState(false);

  const assets = data?.lesson?.assets ?? [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const currentRun = data?.lesson?.pipeline?.currentRun;

  const handleSave = async () => {
    if (!lessonId) return;
    setPipelineError(null);
    const { error: saveError } = await savePipeline({ lessonId, input: { nodes, config: {} } });
    if (saveError) {
      const msg = saveError.graphQLErrors?.[0]?.message ?? saveError.message;
      console.error('[LessonPipelinePage] savePipeline failed:', msg, saveError);
      setPipelineError(msg); return;
    }
    resetDirty();
  };

  const handleRun = async () => {
    if (nodes.length === 0) { setPipelineError('יש להוסיף לפחות מודול אחד ל-Pipeline'); return; }
    setPipelineError(null);
    let pipelineId = data?.lesson?.pipeline?.id;
    // If no saved pipeline yet, save first and use the returned ID
    if (!pipelineId) {
      if (!lessonId) return;
      const { data: saveData, error: saveError } = await savePipeline({ lessonId, input: { nodes, config: {} } });
      if (saveError) {
        const msg = saveError.graphQLErrors?.[0]?.message ?? saveError.message;
        console.error('[LessonPipelinePage] save-before-run failed:', msg, saveError);
        setPipelineError(msg); return;
      }
      pipelineId = saveData?.saveLessonPipeline?.id;
      if (!pipelineId) { setPipelineError('שגיאה: לא ניתן לשמור את ה-Pipeline'); return; }
      resetDirty();
    }
    const { error: runError } = await startRun({ pipelineId });
    if (runError) {
      const msg = runError.graphQLErrors?.[0]?.message ?? runError.message;
      console.error('[LessonPipelinePage] startRun failed:', msg, runError);
      setPipelineError(msg); return;
    }
    reexecute({ requestPolicy: 'network-only' });
  };

  const handleCancel = async () => {
    const runId = currentRun?.id;
    if (!runId) return;
    const { error } = await cancelRun({ runId });
    if (error) console.error('[LessonPipelinePage] cancelRun failed:', error.message);
    reexecute({ requestPolicy: 'network-only' });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const moduleType = e.dataTransfer.getData('moduleType') as PipelineModuleType;
    if (moduleType) addNode(moduleType);
  };

  const isRunning = currentRun?.status === 'RUNNING' || starting;

  return (
    <Layout>
      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onLeave={() => blocker.proceed?.()}
        onStay={() => blocker.reset?.()}
      />
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId}/lessons/${lessonId}`)}>
              ← {data?.lesson?.title ?? 'שיעור'}
            </Button>
            <span className="text-sm text-muted-foreground">Pipeline Builder</span>
            <select
              className="text-xs border rounded px-2 py-1 bg-card"
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value as 'THEMATIC' | 'SEQUENTIAL' | 'CUSTOM' | '';
                if (val === 'CUSTOM') {
                  clearNodes();
                  setCustomMode(true);
                } else if (val) {
                  loadTemplate(val);
                  setCustomMode(false);
                }
                (e.target as HTMLSelectElement).value = '';
              }}
              data-testid="template-picker"
            >
              <option value="">טעינת תבנית...</option>
              <option value="THEMATIC">תמטי (8 מודולים)</option>
              <option value="SEQUENTIAL">סדרתי (9 מודולים)</option>
              <option value="CUSTOM">🔧 בנה ידנית (מאפס)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={!isDirty || saving} data-testid="save-btn">
              {saving ? 'שומר...' : 'שמור'}
            </Button>
            <Button size="sm" onClick={handleRun} disabled={isRunning} data-testid="run-btn">
              {isRunning ? '▶ מריץ...' : '▶ הפעל Pipeline'}
            </Button>
          </div>
        </div>

        {pipelineError && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm" data-testid="pipeline-error" role="alert">
            {pipelineError}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Module Palette */}
          <div className="w-56 border-r bg-muted overflow-y-auto p-3 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">מודולים</p>
            {ALL_MODULES.map((m) => (
              <div key={m} draggable onDragStart={(e) => e.dataTransfer.setData('moduleType', m)}
                className="bg-card border rounded-lg p-2 mb-2 cursor-grab text-xs hover:border-blue-400 hover:shadow-sm active:cursor-grabbing"
              >
                <div className="font-medium">{MODULE_LABELS[m].he}</div>
                <div className="text-muted-foreground">{MODULE_LABELS[m].en}</div>
              </div>
            ))}
          </div>

          {/* Pipeline Canvas */}
          <div className="flex-1 p-4 overflow-y-auto" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
            {nodes.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-xl"
                data-testid="empty-canvas"
              >
                {customMode ? (
                  <>
                    <p className="text-4xl mb-3">🔧</p>
                    <p className="text-lg font-medium text-blue-600">מצב בנייה חופשית</p>
                    <p className="text-sm mt-1">גרור מודולים מהחלונית השמאלית לכאן</p>
                    <p className="text-xs text-muted-foreground mt-2">בנה Pipeline מותאם אישית ללא תבנית מוכנה</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl mb-3">🔗</p>
                    <p className="text-lg font-medium">גרור מודולים לכאן</p>
                    <p className="text-sm">בנה את ה-Pipeline שלך, או בחר תבנית מהסרגל</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-w-lg mx-auto">
                {nodes.map((node, idx) => (
                  <PipelineNodeCard key={node.id} node={node} idx={idx} total={nodes.length}
                    isSelected={selectedNodeId === node.id}
                    onSelect={() => setSelectedNode(selectedNodeId === node.id ? null : node.id)}
                    onRemove={() => removeNode(node.id)}
                    onMoveUp={() => idx > 0 && reorderNodes(idx, idx - 1)}
                    onMoveDown={() => idx < nodes.length - 1 && reorderNodes(idx, idx + 1)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Config Panel */}
          {selectedNode && (
            <PipelineConfigPanel node={selectedNode} assets={assets} onClose={() => setSelectedNode(null)} />
          )}
        </div>

        {/* Run Results */}
        {currentRun && <PipelineRunStatus run={currentRun} onCancel={handleCancel} />}
      </div>
    </Layout>
  );
}

// ── Node Card ─────────────────────────────────────────────────────────────────

interface NodeCardProps { node: PipelineNode; idx: number; total: number; isSelected: boolean; onSelect: () => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void; }

function PipelineNodeCard({ node, idx, total, isSelected, onSelect, onRemove, onMoveUp, onMoveDown }: NodeCardProps) {
  return (
    <div
      className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : node.enabled ? 'border-border bg-card hover:border-blue-300' : 'border-border bg-muted opacity-50'}`}
      onClick={onSelect}
      data-testid={`pipeline-node-${node.moduleType}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{idx + 1}</span>
          <div>
            <div className="text-sm font-medium">{node.labelHe}</div>
            <div className="text-xs text-muted-foreground">{node.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={idx === 0}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs" aria-label="הזז למעלה">↑</button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={idx === total - 1}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs" aria-label="הזז למטה">↓</button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 text-xs" aria-label="הסר מודול">✕</button>
        </div>
      </div>
    </div>
  );
}
