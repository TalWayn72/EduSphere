/**
 * LayerToggleBar — pill/chip toggles for annotation layer visibility.
 * Active layers show with full opacity + Eye icon; inactive = 30% opacity + EyeOff icon.
 * Clicking a chip calls onToggle(layer) to flip its state in the parent.
 */
import { Eye, EyeOff } from 'lucide-react';
import { AnnotationLayer } from '@/types/annotations';
import { LAYER_META } from '@/pages/content-viewer.utils';

interface LayerToggleBarProps {
  activeLayers: AnnotationLayer[];
  /** Optional counts per layer to show a badge */
  counts?: Partial<Record<AnnotationLayer, number>>;
  onToggle: (layer: AnnotationLayer) => void;
}

const ALL_LAYERS = Object.values(AnnotationLayer);

export function LayerToggleBar({
  activeLayers,
  counts,
  onToggle,
}: LayerToggleBarProps) {
  return (
    <div
      className="flex flex-wrap gap-1"
      role="group"
      aria-label="Annotation layer visibility toggles"
    >
      {ALL_LAYERS.map((layer) => {
        const isActive = activeLayers.includes(layer);
        const meta = LAYER_META[layer];
        const count = counts?.[layer];

        return (
          <button
            key={layer}
            type="button"
            aria-pressed={isActive}
            aria-label={`${isActive ? 'Hide' : 'Show'} ${meta?.label ?? layer} annotations`}
            onClick={() => onToggle(layer)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border
                        transition-all select-none cursor-pointer
                        ${meta?.bg ?? 'bg-muted'} ${meta?.color ?? 'text-foreground'}
                        ${isActive ? 'opacity-100 shadow-sm' : 'opacity-30 hover:opacity-50'}`}
          >
            {isActive ? (
              <Eye className="h-3 w-3 flex-shrink-0" />
            ) : (
              <EyeOff className="h-3 w-3 flex-shrink-0" />
            )}
            <span>{meta?.label ?? layer}</span>
            {count !== undefined && (
              <span className="ml-0.5 font-semibold tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
