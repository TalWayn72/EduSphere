/**
 * PdfDocumentViewer — Composite PDF viewer with annotation + sketch support.
 *
 * Combines PdfViewer + PdfAnnotationLayer + PdfSketchOverlay.
 * Toolbar: View/Annotate/Sketch modes, zoom controls.
 * Sidebar: annotation list (reuses CommentCard).
 *
 * Memory safety: PDF doc cleanup delegated to PdfViewer; overlay refs cleared on unmount.
 */
import { useState, useCallback, useMemo } from 'react';
import { MousePointer2, MessageSquare, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Annotation } from '@/types/annotations';
import { PdfViewer } from './PdfViewer';
import { PdfAnnotationLayer } from './PdfAnnotationLayer';
import { PdfSketchOverlay, type PdfSketchData } from './PdfSketchOverlay';
import type { DrawingTool } from '../useSketchCanvas';

export type ViewerMode = 'view' | 'annotate' | 'sketch';

export interface PdfDocumentViewerProps {
  url: string;
  annotations?: Annotation[];
  onAnnotationCreate?: (data: { text: string; page: number }) => void;
  onAnnotationClick?: (id: string) => void;
  onSketchSave?: (data: PdfSketchData) => void;
  className?: string;
}

const MODE_ITEMS: { id: ViewerMode; label: string; Icon: React.ElementType }[] = [
  { id: 'view', label: 'View', Icon: MousePointer2 },
  { id: 'annotate', label: 'Annotate', Icon: MessageSquare },
  { id: 'sketch', label: 'Sketch', Icon: Pencil },
];

export function PdfDocumentViewer({
  url,
  annotations = [],
  onAnnotationCreate,
  onAnnotationClick,
  onSketchSave,
  className,
}: PdfDocumentViewerProps) {
  const [mode, setMode] = useState<ViewerMode>('view');
  const [activeTool, setActiveTool] = useState<DrawingTool>('freehand');
  const [currentPage, setCurrentPage] = useState(1);
  const [focusedAnnotationId, setFocusedAnnotationId] = useState<string | null>(null);
  const [canvasSize] = useState({ width: 800, height: 600 });

  const handleTextSelect = useCallback(
    (_range: { from: number; to: number }) => {
      if (mode !== 'annotate') return;
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (text) onAnnotationCreate?.({ text, page: currentPage });
    },
    [mode, currentPage, onAnnotationCreate],
  );

  const handleAnnotationClick = useCallback(
    (id: string) => {
      setFocusedAnnotationId(id);
      onAnnotationClick?.(id);
    },
    [onAnnotationClick],
  );

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => {
      const page = (a.spatialData?.page as number) ?? 1;
      return page === currentPage;
    }),
    [annotations, currentPage],
  );

  return (
    <div
      data-testid="pdf-document-viewer"
      aria-label="PDF Document Viewer"
      className={cn('flex flex-col h-full', className)}
    >
      {/* Mode toolbar */}
      <div
        role="toolbar"
        aria-label="Document toolbar"
        data-testid="viewer-toolbar"
        className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/50 dark:bg-gray-800/50"
      >
        {MODE_ITEMS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            variant="ghost"
            size="sm"
            data-testid={`mode-${id}`}
            aria-pressed={mode === id}
            className={cn(
              'h-7 px-2 text-xs gap-1',
              mode === id && 'bg-accent text-accent-foreground',
            )}
            onClick={() => setMode(id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}

        {mode === 'sketch' && (
          <div data-testid="sketch-tool-bar" role="toolbar" aria-label="Sketch drawing tools" className="flex items-center gap-0.5 ml-2 border-l pl-2">
            {(['freehand', 'eraser', 'rect', 'ellipse', 'arrow', 'text'] as DrawingTool[]).map(
              (tool) => (
                <button
                  key={tool}
                  data-testid={`viewer-sketch-tool-${tool}`}
                  aria-pressed={activeTool === tool}
                  aria-label={`${tool} drawing tool`}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs transition-colors',
                    activeTool === tool
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                  onClick={() => setActiveTool(tool)}
                >
                  {tool}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* PDF content area */}
      <div className="flex-1 relative overflow-hidden" data-testid="pdf-content-area">
        <PdfViewer
          fileUrl={url}
          onTextSelect={mode === 'annotate' ? handleTextSelect : undefined}
          onPageChange={setCurrentPage}
        />

        {/* Annotation layer overlay */}
        {pageAnnotations.length > 0 && (
          <PdfAnnotationLayer
            annotations={pageAnnotations}
            pageNum={currentPage}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            onAnnotationClick={handleAnnotationClick}
            focusedAnnotationId={focusedAnnotationId ?? undefined}
          />
        )}

        {/* Sketch overlay */}
        {mode === 'sketch' && (
          <PdfSketchOverlay
            width={canvasSize.width}
            height={canvasSize.height}
            currentPage={currentPage}
            activeTool={activeTool}
            color="#ef4444"
            strokeWidth={3}
            onSave={onSketchSave}
          />
        )}

        {/* Text selection area for annotations */}
        {mode === 'annotate' && (
          <div
            data-testid="text-selection-area"
            role="region"
            aria-label="Text selection area for annotations"
            className="absolute inset-0 cursor-text"
            onMouseUp={() => {
              const sel = window.getSelection();
              if (sel?.toString().trim()) {
                onAnnotationCreate?.({ text: sel.toString(), page: currentPage });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
