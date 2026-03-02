/**
 * AnnotationsTab — annotations panel for UnifiedLearningPage.
 * Shows layer toggles + threaded annotation list + add-annotation form.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayerToggleBar } from '@/components/LayerToggleBar';
import { AnnotationThread } from '@/components/AnnotationThread';
import { AnnotationLayer, type Annotation } from '@/types/annotations';
import { LAYER_META, formatTime } from '@/pages/content-viewer.utils';

interface Props {
  annotations: Annotation[];
  fetching: boolean;
  currentTime: number;
  onSeek: (t: number) => void;
  onAddAnnotation: (text: string, layer: AnnotationLayer, time: number) => void;
  onReply: (parentId: string, content: string, layer: AnnotationLayer) => void;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function AnnotationsTab({
  annotations,
  fetching,
  currentTime,
  onSeek,
  onAddAnnotation,
  onReply,
}: Props) {
  const { t } = useTranslation(['content', 'common']);
  const [activeLayers, setActiveLayers] = useState<AnnotationLayer[]>([
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ]);
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newLayer, setNewLayer] = useState<AnnotationLayer>(
    AnnotationLayer.PERSONAL
  );

  const toggleLayer = (layer: AnnotationLayer) =>
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );

  const handleSave = () => {
    if (!newText.trim()) return;
    onAddAnnotation(newText, newLayer, currentTime);
    setNewText('');
    setShowForm(false);
  };

  const visible = annotations.filter(
    (a) => !a.parentId && activeLayers.includes(a.layer)
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold">
            {t('common:annotations')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('common:add')}
          </Button>
        </div>
        <LayerToggleBar activeLayers={activeLayers} onToggle={toggleLayer} />
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-3 py-2 border-b bg-muted/20 flex-shrink-0 space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(LAYER_META) as AnnotationLayer[]).map((l) => (
              <button
                key={l}
                onClick={() => setNewLayer(l)}
                className={`px-2 py-0.5 rounded text-xs border ${LAYER_META[l]?.bg ?? ''} ${LAYER_META[l]?.color ?? ''}
                  ${newLayer === l ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-60'}`}
              >
                {LAYER_META[l]?.label}
              </button>
            ))}
          </div>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t('content:annotationPlaceholder')}
            className="w-full text-xs px-2 py-1.5 border rounded bg-background resize-none"
            rows={2}
          />
          <div className="flex gap-1 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => setShowForm(false)}
            >
              {t('common:cancel')}
            </Button>
            <Button size="sm" className="h-6 text-xs" onClick={handleSave}>
              {t('content:saveAt', { time: formatTime(currentTime) })}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {fetching && visible.length === 0
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1 p-2 border rounded">
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="h-3 w-full" />
              </div>
            ))
          : null}
        {!fetching && visible.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t('content:noAnnotationsVisible')}
          </p>
        )}
        {visible.map((ann) => (
          <AnnotationThread
            key={ann.id}
            annotation={ann}
            onSeek={onSeek}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  );
}
