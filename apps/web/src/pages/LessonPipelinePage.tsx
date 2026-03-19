/**
 * LessonPipelinePage — drag-drop pipeline builder for a lesson.
 * Route: /courses/:courseId/lessons/:lessonId/pipeline
 *
 * Layout (responsive):
 *   Desktop (>=1024px): [palette | canvas | config panel]
 *   Tablet (768-1023px): [palette + canvas], config stacked below
 *   Mobile (<768px): single column, palette as bottom sheet
 *
 * Accessibility: @dnd-kit with KeyboardSensor, aria-live announcements.
 * Print: @media print hides chrome, shows results only.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { REFETCH_DELAY_MS } from '@/lib/constants';
import {
  LESSON_QUERY,
  SAVE_LESSON_PIPELINE_MUTATION,
  START_PIPELINE_RUN_MUTATION,
  CANCEL_PIPELINE_RUN_MUTATION,
  PIPELINE_TEMPLATES_QUERY,
  CREATE_PIPELINE_TEMPLATE_MUTATION,
} from '@/lib/graphql/lesson.queries';
import { useLessonPipelineStore, type PipelineNode } from '@/lib/lesson-pipeline.store';
import { PipelineConfigPanel } from '@/components/pipeline/PipelineConfigPanel';
import { PipelineRunStatus } from '@/components/pipeline/PipelineRunStatus';
import { PipelineSortableCanvas } from '@/components/pipeline/PipelineSortableCanvas';
import { PipelineModulePalette } from '@/components/pipeline/PipelineModulePalette';
import { PipelinePrintStylesheet } from '@/components/pipeline/PipelinePrintStyles';
import { PipelineToolbar } from '@/components/pipeline/PipelineToolbar';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';

interface LessonAsset { id: string; assetType: string; sourceUrl?: string | null; fileUrl?: string | null; }
interface PipelineRun { id: string; status: string; startedAt?: string | null; completedAt?: string | null; results: { id: string; moduleName: string; outputType: string; outputData?: Record<string, unknown> | null; fileUrl?: string | null }[]; }
interface LessonQueryData {
  lesson: { id: string; title: string; assets: LessonAsset[]; pipeline?: { id: string; nodes: PipelineNode[]; status: string; currentRun?: PipelineRun | null } | null } | null;
}

interface ServerTemplate { id: string; name: string; description?: string | null; nodes: Array<{ moduleType: string }>; isSystem: boolean; }
interface TemplatesQueryData { pipelineTemplates: ServerTemplate[]; }

export function LessonPipelinePage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const store = useLessonPipelineStore();
  const { nodes, isDirty, selectedNodeId, addNode, removeNode, reorderNodes, setSelectedNode, setNodes, loadTemplate, loadServerTemplate, clearNodes, resetDirty, undo, redo, canUndo, canRedo } = store;
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const blocker = useUnsavedChangesGuard(isDirty, 'LessonPipelinePage');

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, error: lessonError }, reexecute] = useQuery<LessonQueryData>({
    query: LESSON_QUERY, variables: { id: lessonId }, pause: !mounted || !lessonId,
  });
  useEffect(() => {
    if (lessonError) console.error('[LessonPipelinePage] query error:', lessonError.message);
  }, [lessonError]);

  const [{ fetching: saving }, savePipeline] = useMutation(SAVE_LESSON_PIPELINE_MUTATION);
  const [{ fetching: starting }, startRun] = useMutation(START_PIPELINE_RUN_MUTATION);
  const [, cancelRun] = useMutation(CANCEL_PIPELINE_RUN_MUTATION);

  const [{ data: tplData }] = useQuery<TemplatesQueryData>({ query: PIPELINE_TEMPLATES_QUERY, pause: !mounted });
  const [, createTemplate] = useMutation(CREATE_PIPELINE_TEMPLATE_MUTATION);
  const serverTemplates = tplData?.pipelineTemplates ?? [];

  // Load saved pipeline nodes into store
  useEffect(() => {
    const savedNodes = data?.lesson?.pipeline?.nodes;
    if (Array.isArray(savedNodes) && savedNodes.length > 0) { setNodes(savedNodes); resetDirty(); }
  }, [data?.lesson?.pipeline, setNodes, resetDirty]);

  // Toast on run status transitions
  const prevRunStatus = useRef<string | null>(null);
  useEffect(() => {
    const status = data?.lesson?.pipeline?.currentRun?.status ?? null;
    const prev = prevRunStatus.current;
    prevRunStatus.current = status;
    if (!prev && status === 'RUNNING') toast.info('הצנרת הופעלה');
    else if (prev === 'RUNNING' && status === 'COMPLETED') toast.success('הצנרת הושלמה בהצלחה');
    else if (prev === 'RUNNING' && status === 'FAILED') toast.error('הצנרת נכשלה');
  }, [data?.lesson?.pipeline?.currentRun?.status]);

  // Poll while run active
  useEffect(() => {
    const status = data?.lesson?.pipeline?.currentRun?.status;
    if (status === 'RUNNING') {
      const t = setTimeout(() => reexecute({ requestPolicy: 'network-only' }), REFETCH_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [data?.lesson?.pipeline?.currentRun?.status, reexecute]);

  const [customMode, setCustomMode] = useState(false);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);

  const assets = data?.lesson?.assets ?? [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const currentRun = data?.lesson?.pipeline?.currentRun;
  const isRunning = currentRun?.status === 'RUNNING' || starting;
  const lessonTitle = data?.lesson?.title ?? 'Lesson';

  // Auto-open config on mobile when node selected
  useEffect(() => { setMobileConfigOpen(Boolean(selectedNode)); }, [selectedNode]);

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

  return (
    <Layout>
      <PipelinePrintStylesheet />
      <UnsavedChangesDialog open={blocker.state === 'blocked'} onLeave={() => blocker.proceed?.()} onStay={() => blocker.reset?.()} />
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <PipelineToolbar
          courseId={courseId} lessonId={lessonId} lessonTitle={lessonTitle}
          isDirty={isDirty} saving={saving} isRunning={isRunning}
          hasResults={currentRun?.status === 'COMPLETED'}
          canUndo={canUndo} canRedo={canRedo}
          serverTemplates={serverTemplates} nodes={nodes}
          onSave={handleSave} onRun={handleRun}
          onUndo={undo} onRedo={redo}
          onTemplateChange={(val) => {
            if (val === 'CUSTOM') { clearNodes(); setCustomMode(true); }
            else if (val === 'THEMATIC' || val === 'SEQUENTIAL') { loadTemplate(val); setCustomMode(false); }
          }}
          onServerTemplate={(tpl) => { loadServerTemplate(tpl.nodes); setCustomMode(false); }}
          onCreateTemplate={async (name) => {
            const { error } = await createTemplate({ input: { name, nodes, config: {} } });
            if (error) { console.error('[LessonPipelinePage] createTemplate failed:', error.message); toast.error('Failed to save template. Please try again.'); return false; }
            toast.success('התבנית נשמרה בהצלחה'); return true;
          }}
          onRestore={(run) => { if (run.results.length > 0) reexecute({ requestPolicy: 'network-only' }); }}
        />

        {pipelineError && (
          <div className="px-4 sm:px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm" data-testid="pipeline-error" role="alert">
            {pipelineError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <PipelineModulePalette onAddModule={addNode} />

          <div className="flex-1 p-4 overflow-y-auto">
            <PipelineSortableCanvas
              nodes={nodes} selectedNodeId={selectedNodeId} customMode={customMode}
              onSelect={setSelectedNode} onRemove={removeNode}
              onReorder={reorderNodes} onDropModule={addNode}
            />
          </div>

          {/* Config Panel — desktop sidebar */}
          {selectedNode && (
            <div className="hidden lg:block">
              <PipelineConfigPanel node={selectedNode} assets={assets} onClose={() => setSelectedNode(null)} />
            </div>
          )}
        </div>

        {/* Config Panel — mobile/tablet full-width stacked */}
        {selectedNode && mobileConfigOpen && (
          <div className="lg:hidden border-t max-h-[50vh] overflow-y-auto">
            <PipelineConfigPanel node={selectedNode} assets={assets} onClose={() => { setSelectedNode(null); setMobileConfigOpen(false); }} />
          </div>
        )}

        {/* Print-only header */}
        <div data-testid="print-header">Pipeline — {lessonTitle}</div>

        {/* Run Results */}
        {currentRun && <PipelineRunStatus run={currentRun} onCancel={handleCancel} />}
      </div>
    </Layout>
  );
}
