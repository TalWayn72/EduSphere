import React from 'react';
import { ZoomIn, ZoomOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AnnotationLayer } from '@/types/annotations';

const ZOOM_LEVELS: Array<0.75 | 1 | 1.25 | 1.5> = [0.75, 1, 1.25, 1.5];
const ZOOM_LABELS: Record<number, string> = {
  0.75: '75%',
  1: '100%',
  1.25: '125%',
  1.5: '150%',
};

const LAYER_OPTIONS = [
  { value: AnnotationLayer.PERSONAL, label: 'Private' },
  { value: AnnotationLayer.SHARED, label: 'Public' },
  { value: AnnotationLayer.INSTRUCTOR, label: 'Authority' },
];

interface Props {
  title: string;
  documentZoom: 0.75 | 1 | 1.25 | 1.5;
  onZoomChange: (zoom: 0.75 | 1 | 1.25 | 1.5) => void;
  defaultAnnotationLayer: AnnotationLayer;
  onDefaultLayerChange: (layer: AnnotationLayer) => void;
}

export function DocumentAnnotationToolbar({
  title,
  documentZoom,
  onZoomChange,
  defaultAnnotationLayer,
  onDefaultLayerChange,
}: Props) {
  const navigate = useNavigate();

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(documentZoom);
    const next = ZOOM_LEVELS[idx + 1];
    if (idx < ZOOM_LEVELS.length - 1 && next !== undefined) onZoomChange(next);
  };

  const zoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(documentZoom);
    const prev = ZOOM_LEVELS[idx - 1];
    if (idx > 0 && prev !== undefined) onZoomChange(prev);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-background/95 backdrop-blur shrink-0 h-10">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => navigate(-1)}
        aria-label="Back"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm font-medium truncate flex-1 min-w-0">{title}</span>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={zoomOut}
          disabled={documentZoom === 0.75}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs w-10 text-center tabular-nums">
          {ZOOM_LABELS[documentZoom]}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={zoomIn}
          disabled={documentZoom === 1.5}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Default layer selector */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">Default:</label>
        <select
          value={defaultAnnotationLayer}
          onChange={(e) =>
            onDefaultLayerChange(e.target.value as AnnotationLayer)
          }
          className="rounded border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Default annotation layer"
        >
          {LAYER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
