import { ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ANNOTATION_LAYER_CONFIGS, AnnotationLayer } from '@/types/annotations';

type DocumentZoom = 0.75 | 1 | 1.25 | 1.5;
const ZOOM_LEVELS: DocumentZoom[] = [0.75, 1, 1.25, 1.5];
const ZOOM_LABELS: Record<DocumentZoom, string> = {
  0.75: '75%',
  1: '100%',
  1.25: '125%',
  1.5: '150%',
};

interface DocumentToolbarProps {
  title: string;
  documentZoom: DocumentZoom;
  onZoomChange: (z: DocumentZoom) => void;
  defaultAnnotationLayer: AnnotationLayer;
  onDefaultLayerChange: (l: AnnotationLayer) => void;
}

export function DocumentToolbar({
  title,
  documentZoom,
  onZoomChange,
  defaultAnnotationLayer,
  onDefaultLayerChange,
}: DocumentToolbarProps) {
  const currentIdx = ZOOM_LEVELS.indexOf(documentZoom);

  const zoomOut = () => {
    if (currentIdx > 0)
      onZoomChange(ZOOM_LEVELS[currentIdx - 1] as DocumentZoom);
  };

  const zoomIn = () => {
    if (currentIdx < ZOOM_LEVELS.length - 1)
      onZoomChange(ZOOM_LEVELS[currentIdx + 1] as DocumentZoom);
  };

  return (
    <header className="shrink-0 border-b bg-background/95 backdrop-blur px-3 py-2 flex items-center gap-3">
      <Button variant="ghost" size="sm" asChild className="h-7 px-2">
        <Link to="/courses">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      <h1 className="text-sm font-medium text-foreground flex-1 truncate">
        {title}
      </h1>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={zoomOut}
          disabled={currentIdx === 0}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-9 text-center">
          {ZOOM_LABELS[documentZoom]}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={zoomIn}
          disabled={currentIdx === ZOOM_LEVELS.length - 1}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-l pl-3 ml-1">
        <span className="text-[10px] text-muted-foreground shrink-0">
          Default:
        </span>
        <select
          value={defaultAnnotationLayer}
          onChange={(e) =>
            onDefaultLayerChange(e.target.value as AnnotationLayer)
          }
          className="rounded border border-input bg-background px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          title="Default comment visibility"
        >
          {Object.values(AnnotationLayer)
            .filter((l) => l !== AnnotationLayer.AI_GENERATED)
            .map((l) => (
              <option key={l} value={l}>
                {ANNOTATION_LAYER_CONFIGS[l].icon}{' '}
                {ANNOTATION_LAYER_CONFIGS[l].label}
              </option>
            ))}
        </select>
      </div>
    </header>
  );
}
