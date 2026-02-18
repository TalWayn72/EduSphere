import { useState, useMemo } from 'react';
import {
  Annotation,
  AnnotationLayer,
  ANNOTATION_LAYER_CONFIGS,
} from '@/types/annotations';
import {
  getThreadedAnnotations,
  filterAnnotationsByLayers,
  getAnnotationCountByLayer,
} from '@/lib/mock-annotations';
import { AnnotationItem } from './AnnotationItem';
import { AnnotationForm } from './AnnotationForm';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
  const [annotations, setAnnotations] = useState<Annotation[]>(getThreadedAnnotations());
  const [enabledLayers, setEnabledLayers] = useState<AnnotationLayer[]>([
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [sortBy, setSortBy] = useState<'timestamp' | 'recent'>('timestamp');

  // Filter annotations by enabled layers
  const filteredAnnotations = useMemo(() => {
    return filterAnnotationsByLayers(annotations, enabledLayers);
  }, [annotations, enabledLayers]);

  // Sort annotations
  const sortedAnnotations = useMemo(() => {
    const sorted = [...filteredAnnotations];
    if (sortBy === 'timestamp') {
      sorted.sort((a, b) => (a.contentTimestamp || 0) - (b.contentTimestamp || 0));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [filteredAnnotations, sortBy]);

  // Get annotation counts
  const annotationCounts = useMemo(() => {
    return getAnnotationCountByLayer(annotations);
  }, [annotations]);

  // Toggle layer visibility
  const toggleLayer = (layer: AnnotationLayer) => {
    setEnabledLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  // Add new annotation
  const handleAddAnnotation = (content: string, layer: AnnotationLayer, timestamp?: number) => {
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      content,
      layer,
      userId: currentUserId,
      userName: 'You',
      userRole: currentUserRole,
      timestamp: timestamp ? formatTimestamp(timestamp) : '',
      contentId,
      contentTimestamp: timestamp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setIsAddingNew(false);
  };

  // Add reply
  const handleReply = (parentId: string, content: string, layer: AnnotationLayer) => {
    const reply: Annotation = {
      id: `ann-${Date.now()}`,
      content,
      layer,
      userId: currentUserId,
      userName: 'You',
      userRole: currentUserRole,
      timestamp: '',
      contentId,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    };

    setAnnotations((prev) => {
      const updated = [...prev, reply];
      return buildAnnotationTree(updated);
    });
  };

  // Edit annotation
  const handleEdit = (annotationId: string, newContent: string) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId
          ? { ...ann, content: newContent, updatedAt: new Date().toISOString() }
          : ann
      )
    );
  };

  // Delete annotation
  const handleDelete = (annotationId: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId && ann.parentId !== annotationId));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Annotations</h2>
          <Button onClick={() => setIsAddingNew(!isAddingNew)} size="sm">
            {isAddingNew ? 'Cancel' : '+ New Annotation'}
          </Button>
        </div>

        {/* Layer Filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Layers</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(AnnotationLayer).map((layer) => {
              const config = ANNOTATION_LAYER_CONFIGS[layer];
              const count = annotationCounts[layer] || 0;
              return (
                <div key={layer} className="flex items-center gap-2">
                  <Checkbox
                    id={`layer-${layer}`}
                    checked={enabledLayers.includes(layer)}
                    onCheckedChange={() => toggleLayer(layer)}
                  />
                  <Label
                    htmlFor={`layer-${layer}`}
                    className="text-sm cursor-pointer flex items-center gap-1"
                  >
                    <span>{config.icon}</span>
                    <span className={config.color}>{config.label}</span>
                    <span className="text-gray-400">({count})</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 text-sm">
          <Label className="self-center">Sort by:</Label>
          <Button
            variant={sortBy === 'timestamp' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('timestamp')}
          >
            Timestamp
          </Button>
          <Button
            variant={sortBy === 'recent' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('recent')}
          >
            Most Recent
          </Button>
        </div>
      </div>

      {/* Add New Annotation Form */}
      {isAddingNew && (
        <div className="p-4 bg-white border-b">
          <AnnotationForm
            userRole={currentUserRole}
            contentTimestamp={contentTimestamp}
            onSubmit={handleAddAnnotation}
            onCancel={() => setIsAddingNew(false)}
          />
        </div>
      )}

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedAnnotations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No annotations yet</p>
            <p className="text-xs mt-1">Be the first to add an annotation!</p>
          </div>
        ) : (
          sortedAnnotations.map((annotation) => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 bg-white border-t text-xs text-gray-500 flex justify-between">
        <span>
          {sortedAnnotations.length} of {annotations.length} annotations visible
        </span>
        <span>
          {enabledLayers.length} of {Object.keys(AnnotationLayer).length} layers enabled
        </span>
      </div>
    </div>
  );
}

// Utility function to rebuild annotation tree
function buildAnnotationTree(annotations: Annotation[]): Annotation[] {
  const annotationMap = new Map<string, Annotation>();
  const result: Annotation[] = [];

  // First pass: create map
  annotations.forEach((ann) => {
    annotationMap.set(ann.id, { ...ann, replies: [] });
  });

  // Second pass: build relationships
  annotations.forEach((ann) => {
    const annotation = annotationMap.get(ann.id)!;
    if (ann.parentId) {
      const parent = annotationMap.get(ann.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(annotation);
      }
    } else {
      result.push(annotation);
    }
  });

  return result;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
