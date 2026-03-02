/**
 * LessonPipelinePage — drag-drop pipeline builder for a lesson.
 * Route: /courses/:courseId/lessons/:lessonId/pipeline
 *
 * Left panel: module palette (draggable)
 * Right panel: pipeline canvas (droppable, ordered node list)
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
} from '@/lib/graphql/lesson.queries';
import {
  useLessonPipelineStore,
  MODULE_LABELS,
  type PipelineModuleType,
  type PipelineNode,
} from '@/lib/lesson-pipeline.store';

const ALL_MODULES: PipelineModuleType[] = [
  'INGESTION',
  'ASR',
  'NER_SOURCE_LINKING',
  'CONTENT_CLEANING',
  'SUMMARIZATION',
  'STRUCTURED_NOTES',
  'DIAGRAM_GENERATOR',
  'CITATION_VERIFIER',
  'QA_GATE',
  'PUBLISH_SHARE',
];

interface LessonQueryData {
  lesson: {
    id: string;
    title: string;
    pipeline?: {
      id: string;
      nodes: PipelineNode[];
      status: string;
    };
  } | null;
}

export function LessonPipelinePage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const navigate = useNavigate();
  const {
    nodes,
    isDirty,
    selectedNodeId,
    addNode,
    removeNode,
    setSelectedNode,
    setNodes,
    resetDirty,
  } = useLessonPipelineStore();
  const [runStatus, setRunStatus] = useState<string | null>(null);

  const [{ data }] = useQuery<LessonQueryData>({
    query: LESSON_QUERY,
    variables: { id: lessonId },
    pause: !lessonId,
  });
  const [{ fetching: saving }, savePipeline] = useMutation(
    SAVE_LESSON_PIPELINE_MUTATION
  );
  const [{ fetching: starting }, startRun] = useMutation(
    START_PIPELINE_RUN_MUTATION
  );

  useEffect(() => {
    const pipeline = data?.lesson?.pipeline;
    if (
      pipeline?.nodes &&
      Array.isArray(pipeline.nodes) &&
      pipeline.nodes.length > 0
    ) {
      setNodes(pipeline.nodes);
      resetDirty();
    }
  }, [data?.lesson?.pipeline, setNodes, resetDirty]);

  const handleSave = async () => {
    if (!lessonId) return;
    await savePipeline({ lessonId, input: { nodes, config: {} } });
    resetDirty();
  };

  const handleRun = async () => {
    const pipeline = data?.lesson?.pipeline;
    if (!pipeline?.id) {
      await handleSave();
    }
    const pipelineId = data?.lesson?.pipeline?.id;
    if (!pipelineId) return;
    const { data: runData } = await startRun({ pipelineId });
    if (runData?.startLessonPipelineRun) {
      setRunStatus('RUNNING');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const moduleType = e.dataTransfer.getData(
      'moduleType'
    ) as PipelineModuleType;
    if (moduleType) addNode(moduleType);
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(`/courses/${courseId}/lessons/${lessonId}`)
              }
            >
              ← {data?.lesson?.title ?? 'שיעור'}
            </Button>
            <span className="text-sm text-gray-400">Pipeline Builder</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saving}
            >
              {saving ? 'שומר...' : 'שמור'}
            </Button>
            <Button
              size="sm"
              onClick={handleRun}
              disabled={starting || runStatus === 'RUNNING'}
            >
              {starting || runStatus === 'RUNNING'
                ? '▶ מריץ...'
                : '▶ הפעל Pipeline'}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Module Palette */}
          <div className="w-56 border-r bg-gray-50 overflow-y-auto p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              מודולים
            </p>
            {ALL_MODULES.map((m) => (
              <div
                key={m}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('moduleType', m);
                }}
                className="bg-white border rounded-lg p-2 mb-2 cursor-grab text-xs hover:border-blue-400 hover:shadow-sm active:cursor-grabbing"
              >
                <div className="font-medium">{MODULE_LABELS[m].he}</div>
                <div className="text-gray-400">{MODULE_LABELS[m].en}</div>
              </div>
            ))}
          </div>

          {/* Pipeline Canvas */}
          <div
            className="flex-1 p-4 overflow-y-auto"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed rounded-xl">
                <p className="text-4xl mb-3">🔗</p>
                <p className="text-lg font-medium">גרור מודולים לכאן</p>
                <p className="text-sm">בנה את ה-Pipeline שלך</p>
              </div>
            ) : (
              <div className="space-y-2 max-w-lg mx-auto">
                {nodes.map((node, idx) => (
                  <PipelineNodeCard
                    key={node.id}
                    node={node}
                    idx={idx}
                    isSelected={selectedNodeId === node.id}
                    onSelect={() =>
                      setSelectedNode(
                        selectedNodeId === node.id ? null : node.id
                      )
                    }
                    onRemove={() => removeNode(node.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface NodeCardProps {
  node: PipelineNode;
  idx: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function PipelineNodeCard({
  node,
  idx,
  isSelected,
  onSelect,
  onRemove,
}: NodeCardProps) {
  return (
    <div
      className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : node.enabled
            ? 'border-gray-200 bg-white hover:border-blue-300'
            : 'border-gray-100 bg-gray-50 opacity-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {idx + 1}
          </span>
          <div>
            <div className="text-sm font-medium">{node.labelHe}</div>
            <div className="text-xs text-gray-400">{node.label}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
