import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const GraphControls = React.memo(function GraphControls({
  onZoomIn,
  onZoomOut,
  onResetView,
}: GraphControlsProps) {
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomIn}
        title="Zoom in"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomOut}
        title="Zoom out"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onResetView}
        title="Reset view"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});
