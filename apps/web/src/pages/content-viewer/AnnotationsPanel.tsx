/** Middle column: annotation CRUD + knowledge graph preview + search. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { LayerToggleBar } from '@/components/LayerToggleBar';
import { AnnotationThread } from '@/components/AnnotationThread';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import { LAYER_META, formatTime } from '../content-viewer.utils';
import { SkeletonLine } from './ContentViewerHelpers';
import { KnowledgeGraphPreview } from './KnowledgeGraphPreview';

export interface AnnotationsPanelProps {
  annotations: Annotation[];
  transcript: Array<{ id: string; startTime: number; text: string }>;
  annotFetching: boolean;
  activeLayers: AnnotationLayer[];
  showAnnotationForm: boolean;
  newAnnotation: string;
  newLayer: AnnotationLayer;
  currentTime: number;
  searchQuery: string;
  onToggleLayer: (layer: AnnotationLayer) => void;
  onToggleForm: () => void;
  onNewAnnotationChange: (value: string) => void;
  onNewLayerChange: (layer: AnnotationLayer) => void;
  onAddAnnotation: () => void;
  onCloseForm: () => void;
  onSearchChange: (value: string) => void;
  onSeek: (time: number) => void;
  onReply: (parentId: string, content: string, layer: AnnotationLayer) => void;
}

export const AnnotationsPanel = React.memo(function AnnotationsPanel({
  annotations,
  transcript,
  annotFetching,
  activeLayers,
  showAnnotationForm,
  newAnnotation,
  newLayer,
  currentTime,
  searchQuery,
  onToggleLayer,
  onToggleForm,
  onNewAnnotationChange,
  onNewLayerChange,
  onAddAnnotation,
  onCloseForm,
  onSearchChange,
  onSeek,
  onReply,
}: AnnotationsPanelProps) {
  const { t } = useTranslation(['content', 'common']);

  return (
    <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 overflow-hidden">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t('common:annotations')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onToggleForm}
            >
              <Plus className="h-3 w-3 mr-1" /> {t('common:add')}
            </Button>
          </div>
          <LayerToggleBar
            activeLayers={activeLayers}
            onToggle={onToggleLayer}
          />
        </div>

        {/* Add annotation form */}
        {showAnnotationForm && (
          <AnnotationForm
            newAnnotation={newAnnotation}
            newLayer={newLayer}
            currentTime={currentTime}
            onNewAnnotationChange={onNewAnnotationChange}
            onNewLayerChange={onNewLayerChange}
            onAddAnnotation={onAddAnnotation}
            onClose={onCloseForm}
          />
        )}

        {/* Annotations list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {annotFetching && annotations.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5 p-3 border rounded-lg">
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonLine className="h-3 w-full" />
                  <SkeletonLine className="h-3 w-3/4" />
                </div>
              ))
            : null}
          {!annotFetching && annotations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              {t('content:noAnnotationsVisible')}
            </p>
          )}
          {annotations.map((ann: Annotation) => (
            <AnnotationThread
              key={ann.id}
              annotation={ann}
              onSeek={onSeek}
              onReply={onReply}
            />
          ))}
        </div>
      </Card>

      {/* Knowledge Graph preview */}
      <KnowledgeGraphPreview
        searchQuery={searchQuery}
        transcript={transcript}
        annotations={annotations}
        onSearchChange={onSearchChange}
        onSeek={onSeek}
      />
    </div>
  );
});

// ── Annotation add form ────────────────────────────────────────────────────────

interface AnnotationFormProps {
  newAnnotation: string;
  newLayer: AnnotationLayer;
  currentTime: number;
  onNewAnnotationChange: (value: string) => void;
  onNewLayerChange: (layer: AnnotationLayer) => void;
  onAddAnnotation: () => void;
  onClose: () => void;
}

function AnnotationForm({
  newAnnotation,
  newLayer,
  currentTime,
  onNewAnnotationChange,
  onNewLayerChange,
  onAddAnnotation,
  onClose,
}: AnnotationFormProps) {
  const { t } = useTranslation(['content', 'common']);

  return (
    <div className="px-4 py-3 border-b bg-muted/30 space-y-2">
      <div className="flex gap-2">
        {(Object.keys(LAYER_META) as AnnotationLayer[]).map((l) => (
          <button
            key={l}
            onClick={() => onNewLayerChange(l)}
            className={`px-2 py-0.5 rounded text-xs border ${LAYER_META[l]?.bg ?? ''} ${LAYER_META[l]?.color ?? ''}
              ${newLayer === l ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-60'}`}
          >
            {LAYER_META[l]?.label}
          </button>
        ))}
      </div>
      <textarea
        value={newAnnotation}
        onChange={(e) => onNewAnnotationChange(e.target.value)}
        placeholder={t('content:annotationPlaceholder')}
        className="w-full text-sm px-3 py-2 border rounded-md bg-background resize-none"
        rows={3}
      />
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onClose}
        >
          {t('common:cancel')}
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={onAddAnnotation}>
          {t('content:saveAt', { time: formatTime(currentTime) })}
        </Button>
      </div>
    </div>
  );
}
