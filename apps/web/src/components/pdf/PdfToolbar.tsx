/**
 * PdfToolbar — page navigation, zoom, and fit-mode controls for PdfViewer.
 */
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ZoomMode = 'fit-width' | 'fit-page' | 'custom';

interface PdfToolbarProps {
  pageNum: number;
  totalPages: number;
  scale: number;
  zoomMode: ZoomMode;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
}

export function PdfToolbar({
  pageNum,
  totalPages,
  scale,
  zoomMode,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
}: PdfToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/50 dark:bg-gray-800/50"
      role="toolbar"
      aria-label="PDF controls"
    >
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevPage} disabled={pageNum <= 1} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs font-mono tabular-nums min-w-[4rem] text-center" aria-live="polite">
        {pageNum} / {totalPages}
      </span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextPage} disabled={pageNum >= totalPages} aria-label="Next page">
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut} aria-label="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs font-mono tabular-nums min-w-[3rem] text-center" aria-live="polite" aria-atomic="true" role="status">
        {Math.round(scale * 100)}%
      </span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn} aria-label="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        className={cn('h-7 w-7', zoomMode === 'fit-width' && 'bg-accent')}
        onClick={onFitWidth}
        aria-label="Fit width"
        aria-pressed={zoomMode === 'fit-width'}
      >
        <Columns2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-7 w-7', zoomMode === 'fit-page' && 'bg-accent')}
        onClick={onFitPage}
        aria-label="Fit page"
        aria-pressed={zoomMode === 'fit-page'}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
