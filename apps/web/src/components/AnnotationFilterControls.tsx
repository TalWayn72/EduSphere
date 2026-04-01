/**
 * AnnotationFilterControls -- Layer filters and sort controls for AnnotationPanel.
 * Extracted from AnnotationPanel for file-size compliance.
 */
import { AnnotationLayer, ANNOTATION_LAYER_CONFIGS } from '@/types/annotations';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AnnotationFilterControlsProps {
  enabledLayers: AnnotationLayer[];
  annotationCounts: Record<string, number>;
  sortBy: 'timestamp' | 'recent';
  onToggleLayer: (layer: AnnotationLayer) => void;
  onSortChange: (sort: 'timestamp' | 'recent') => void;
}

export function AnnotationFilterControls({
  enabledLayers,
  annotationCounts,
  sortBy,
  onToggleLayer,
  onSortChange,
}: AnnotationFilterControlsProps) {
  return (
    <>
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
                  onCheckedChange={() => onToggleLayer(layer)}
                />
                <Label
                  htmlFor={`layer-${layer}`}
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  <span>{config.icon}</span>
                  <span className={config.color}>{config.label}</span>
                  <span className="text-gray-400 dark:text-slate-400">
                    ({count})
                  </span>
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
          onClick={() => onSortChange('timestamp')}
        >
          Timestamp
        </Button>
        <Button
          variant={sortBy === 'recent' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onSortChange('recent')}
        >
          Most Recent
        </Button>
      </div>
    </>
  );
}
