import { useState, useMemo } from 'react';
import {
  Annotation,
  AnnotationLayer,
} from '@/types/annotations';
import {
  getThreadedAnnotations,
  filterAnnotationsByLayers,
  getAnnotationCountByLayer,
} from '@/lib/mock-annotations';
import { AnnotationItem } from './AnnotationItem';
import { AnnotationForm } from './AnnotationForm';
import { AnnotationMergeRequestModal } from './AnnotationMergeRequestModal';
import { AnnotationFilterControls } from './AnnotationFilterControls';
import {
  buildAnnotationTree,
  formatTimestamp,
  createAnnotation,
} from './annotation-helpers';
import { Button } from '@/components/ui/button';

interface AnnotationPanelProps {
  contentId: string;
  currentUserId?: string;
  currentUserRole?: 'student' | 'instructor' | 'ai';
  contentTimestamp?: number;
}

export function AnnotationPanel({
  contentId,
  currentUserId = 'current-user',
  currentUserRole = 'student',
  contentTimestamp,
}: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(
    getThreadedAnnotations()
  );
  const [enabledLayers, setEnabledLayers] = useState<AnnotationLayer[]>([
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [sortBy, setSortBy] = useState<'timestamp' | 'recent'>('timestamp');
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  const filteredAnnotations = useMemo(() => {
    return filterAnnotationsByLayers(annotations, enabledLayers);
  }, [annotations, enabledLayers]);

  const sortedAnnotations = useMemo(() => {
    const sorted = [...filteredAnnotations];
    if (sortBy === 'timestamp') {
      sorted.sort((a, b) => (a.contentTimestamp || 0) - (b.contentTimestamp || 0));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [filteredAnnotations, sortBy]);

  const annotationCounts = useMemo(() => {
    return getAnnotationCountByLayer(annotations);
  }, [annotations]);

  const toggleLayer = (layer: AnnotationLayer) => {
    setEnabledLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  const handleAddAnnotation = (content: string, layer: AnnotationLayer, timestamp?: number) => {
    const newAnnotation = createAnnotation(
      content, layer, currentUserId, currentUserRole, contentId,
      timestamp ? formatTimestamp(timestamp) : '', timestamp
    );
    setAnnotations((prev) => [...prev, newAnnotation]);
    setIsAddingNew(false);
  };

  const handleReply = (parentId: string, content: string, layer: AnnotationLayer) => {
    const reply = createAnnotation(content, layer, currentUserId, currentUserRole, contentId, '', undefined, parentId);
    setAnnotations((prev) => buildAnnotationTree([...prev, reply]));
  };

  const handleEdit = (annotationId: string, newContent: string) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId
          ? { ...ann, content: newContent, updatedAt: new Date().toISOString() }
          : ann
      )
    );
  };

  const handleDelete = (annotationId: string) => {
    setAnnotations((prev) =>
      prev.filter((ann) => ann.id !== annotationId && ann.parentId !== annotationId)
    );
  };

  const handleMergeRequestSubmit = (description: string) => {
    if (!proposingId) return;
    if (import.meta.env.DEV) {
      console.debug('[AnnotationPanel] Merge request submitted:', {
        annotationId: proposingId,
        description,
      });
    }
    setSubmittedIds((prev) => new Set([...prev, proposingId]));
    setProposingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 bg-white border-b space-y-4 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Annotations</h2>
          <Button onClick={() => setIsAddingNew(!isAddingNew)} size="sm">
            {isAddingNew ? 'Cancel' : '+ New Annotation'}
          </Button>
        </div>
        <AnnotationFilterControls
          enabledLayers={enabledLayers}
          annotationCounts={annotationCounts}
          sortBy={sortBy}
          onToggleLayer={toggleLayer}
          onSortChange={setSortBy}
        />
      </div>

      {isAddingNew && (
        <div className="p-4 bg-white border-b dark:bg-gray-900">
          <AnnotationForm
            userRole={currentUserRole}
            contentTimestamp={contentTimestamp}
            onSubmit={handleAddAnnotation}
            onCancel={() => setIsAddingNew(false)}
          />
        </div>
      )}

      {proposingId && (
        <AnnotationMergeRequestModal
          annotationContent={annotations.find((a) => a.id === proposingId)?.content ?? ''}
          onSubmit={handleMergeRequestSubmit}
          onCancel={() => setProposingId(null)}
        />
      )}

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedAnnotations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400">
            <p className="text-sm">No annotations yet</p>
            <p className="text-xs mt-1">Be the first to add an annotation!</p>
          </div>
        ) : (
          sortedAnnotations.map((annotation) => (
            <div key={annotation.id}>
              {submittedIds.has(annotation.id) && (
                <p className="text-xs text-indigo-600 mb-1 ml-1 dark:text-indigo-400" data-testid={`merge-submitted-${annotation.id}`}>
                  Proposal submitted — pending instructor review.
                </p>
              )}
              <AnnotationItem
                annotation={annotation}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPropose={submittedIds.has(annotation.id) ? undefined : (id) => setProposingId(id)}
              />
            </div>
          ))
        )}
      </div>

      <div className="p-3 bg-white dark:bg-slate-800 border-t text-xs text-gray-500 dark:text-slate-400 flex justify-between">
        <span>{sortedAnnotations.length} of {annotations.length} annotations visible</span>
        <span>{enabledLayers.length} of {Object.keys(AnnotationLayer).length} layers enabled</span>
      </div>
    </div>
  );
}
