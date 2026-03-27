/**
 * PdfAnnotationLayer — overlay for rendering annotation highlights on PDF pages.
 *
 * Renders colored highlight rectangles over PDF text regions.
 * Layer colors: PERSONAL=blue, SHARED=green, INSTRUCTOR=orange, AI=purple.
 * Click on highlight fires onAnnotationClick.
 *
 * Memory safety: no timers or subscriptions — pure render component.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

export interface PdfAnnotationLayerProps {
  annotations: Annotation[];
  pageNum: number;
  canvasWidth: number;
  canvasHeight: number;
  onAnnotationClick?: (id: string) => void;
  focusedAnnotationId?: string;
}

/** Maps annotation layer to human-readable name for screen readers. */
const LAYER_READABLE_NAMES: Record<AnnotationLayer, string> = {
  [AnnotationLayer.PERSONAL]: 'Personal',
  [AnnotationLayer.SHARED]: 'Shared',
  [AnnotationLayer.INSTRUCTOR]: 'Instructor',
  [AnnotationLayer.AI_GENERATED]: 'AI Generated',
};

/** Maps annotation layer to highlight background color. */
const LAYER_HIGHLIGHT_COLORS: Record<AnnotationLayer, string> = {
  [AnnotationLayer.PERSONAL]: 'bg-blue-400/30 hover:bg-blue-400/50 border-blue-500',
  [AnnotationLayer.SHARED]: 'bg-green-400/30 hover:bg-green-400/50 border-green-500',
  [AnnotationLayer.INSTRUCTOR]: 'bg-orange-400/30 hover:bg-orange-400/50 border-orange-500',
  [AnnotationLayer.AI_GENERATED]: 'bg-purple-400/30 hover:bg-purple-400/50 border-purple-500',
};

interface HighlightRect {
  annotationId: string;
  layer: AnnotationLayer;
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Converts annotation text ranges to positioned rects.
 * Uses spatialData.page, spatialData.rects if available,
 * otherwise falls back to a simple line-based estimation.
 */
function computeHighlightRects(
  annotations: Annotation[],
  pageNum: number,
  canvasWidth: number,
  canvasHeight: number,
): HighlightRect[] {
  const rects: HighlightRect[] = [];

  for (const ann of annotations) {
    const spatial = ann.spatialData;
    const annPage = (spatial?.page as number) ?? 1;
    if (annPage !== pageNum) continue;

    // If spatialData contains explicit rects (array of {x,y,w,h} in 0-1 coords)
    const spatialRects = spatial?.rects as Array<{ x: number; y: number; w: number; h: number }> | undefined;
    if (spatialRects && spatialRects.length > 0) {
      for (const r of spatialRects) {
        rects.push({
          annotationId: ann.id,
          layer: ann.layer,
          top: r.y * canvasHeight,
          left: r.x * canvasWidth,
          width: r.w * canvasWidth,
          height: r.h * canvasHeight,
        });
      }
    } else if (ann.textRange) {
      // Fallback: estimate position from text range using line approximation
      const lineHeight = 20;
      const charsPerLine = Math.max(1, Math.floor(canvasWidth / 8));
      const startLine = Math.floor(ann.textRange.from / charsPerLine);
      const endLine = Math.floor(ann.textRange.to / charsPerLine);

      for (let line = startLine; line <= endLine; line++) {
        const startChar = line === startLine ? ann.textRange.from % charsPerLine : 0;
        const endChar = line === endLine ? ann.textRange.to % charsPerLine : charsPerLine;
        rects.push({
          annotationId: ann.id,
          layer: ann.layer,
          top: line * lineHeight,
          left: startChar * 8,
          width: (endChar - startChar) * 8,
          height: lineHeight,
        });
      }
    }
  }

  return rects;
}

export function PdfAnnotationLayer({
  annotations,
  pageNum,
  canvasWidth,
  canvasHeight,
  onAnnotationClick,
  focusedAnnotationId,
}: PdfAnnotationLayerProps) {
  const rects = useMemo(
    () => computeHighlightRects(annotations, pageNum, canvasWidth, canvasHeight),
    [annotations, pageNum, canvasWidth, canvasHeight],
  );

  if (rects.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      role="group"
      aria-label={`Annotation highlights on page ${pageNum}`}
      data-testid="pdf-annotation-layer"
    >
      {rects.map((rect, idx) => (
        <button
          key={`${rect.annotationId}-${idx}`}
          className={cn(
            'absolute border-b-2 rounded-sm pointer-events-auto cursor-pointer transition-colors focus:outline-2 focus:outline-primary',
            LAYER_HIGHLIGHT_COLORS[rect.layer],
            focusedAnnotationId === rect.annotationId && 'ring-2 ring-primary',
          )}
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          onClick={() => onAnnotationClick?.(rect.annotationId)}
          aria-label={`${LAYER_READABLE_NAMES[rect.layer]} annotation highlight`}
          data-annotation-id={rect.annotationId}
        />
      ))}
    </div>
  );
}
