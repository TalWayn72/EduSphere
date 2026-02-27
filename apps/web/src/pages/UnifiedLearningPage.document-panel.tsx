/**
 * DocumentPanel — left panel of UnifiedLearningPage.
 * Shows AnnotatedDocumentViewer for document content,
 * an iframe embed for LINK-type content (URL),
 * or a placeholder for video-only items.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnnotatedDocumentViewer } from '@/components/annotation/AnnotatedDocumentViewer';
import { CommentForm } from '@/components/annotation/CommentForm';
import { SelectionCommentButton } from '@/components/annotation/SelectionCommentButton';
import type { TextRangeAnnotation } from '@/components/annotation/AnnotationDecorationsPlugin';
import type { AnnotationLayer } from '@/types/annotations';

interface SelectionState {
  x: number;
  y: number;
  from: number;
  to: number;
}

interface Props {
  content: string;
  hasDocument: boolean;
  textAnnotations: TextRangeAnnotation[];
  focusedAnnotationId: string | null;
  onAnnotationClick: (id: string) => void;
  onAddTextAnnotation: (args: { text: string; layer: AnnotationLayer; from: number; to: number }) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  documentZoom: number;
  defaultAnnotationLayer: AnnotationLayer;
}

/** Rendered when the content item is a bare URL (LINK type). */
function LinkViewer({ url }: { url: string }) {
  const [iframeBlocked, setIframeBlocked] = useState(false);

  // Reset blocked state when URL changes.
  // Also set a 10 s deadline: browsers that honour X-Frame-Options / CSP
  // frame-ancestors show a blank iframe and never fire onError — this
  // heuristic catches those cases.  onLoad cancels the timer on success.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setIframeBlocked(false);
    timeoutRef.current = setTimeout(() => setIframeBlocked(true), 10_000);
    return () => clearTimeout(timeoutRef.current);
  }, [url]);

  const handleLoad = () => clearTimeout(timeoutRef.current);
  const handleError = () => {
    clearTimeout(timeoutRef.current);
    setIframeBlocked(true);
  };

  const openExternal = () => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 bg-muted/20">
        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate flex-1">{url}</span>
        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 gap-1"
          onClick={openExternal}>
          <ExternalLink className="h-3 w-3" />
          פתח בחלון חדש
        </Button>
      </div>

      {/* Embedded viewer.
          sandbox flags:
            allow-scripts                        — page JS runs (required for most sites)
            allow-same-origin                    — site can access its own cookies/storage
            allow-popups                         — target="_blank" links open a new tab
            allow-forms                          — form submissions work
            allow-top-navigation-by-user-activation — user-clicked links may navigate
              the top window.  Without this flag, sandboxed iframes that call
              window.top.location or similar produce an "Unsafe attempt to initiate
              navigation" SecurityError in the console. */}
      {!iframeBlocked ? (
        <iframe
          src={url}
          className="flex-1 w-full border-0"
          title="external-content"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground p-6">
          <ExternalLink className="h-10 w-10 opacity-30" />
          <p className="text-sm text-center">האתר החיצוני לא מאפשר הטמעה.</p>
          <Button variant="default" onClick={openExternal} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            פתח בדפדפן
          </Button>
        </div>
      )}
    </div>
  );
}

export function DocumentPanel({
  content,
  hasDocument,
  textAnnotations,
  focusedAnnotationId,
  onAnnotationClick,
  onAddTextAnnotation,
  scrollContainerRef,
  onScroll,
  documentZoom,
  defaultAnnotationLayer,
}: Props) {
  const { t } = useTranslation('content');
  const [pendingSelection, setPendingSelection] = useState<SelectionState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const pendingRef = useRef(pendingSelection);
  pendingRef.current = pendingSelection;

  const handleSelectionChange = useCallback((sel: SelectionState | null) => {
    setPendingSelection(sel);
    if (!sel) setShowForm(false);
  }, []);

  const handleAddCommentClick = useCallback((pos: { x: number; y: number }) => {
    setPendingSelection((prev) => prev ? { ...prev, x: pos.x, y: pos.y } : null);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback((text: string, layer: AnnotationLayer) => {
    const sel = pendingRef.current;
    if (!sel) return;
    onAddTextAnnotation({ text, layer, from: sel.from, to: sel.to });
    setShowForm(false);
    setPendingSelection(null);
  }, [onAddTextAnnotation]);

  if (!hasDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <FileText className="h-12 w-12 opacity-20" />
        <p className="text-sm">{t('noDocumentForContent', 'אין מסמך לתוכן זה')}</p>
      </div>
    );
  }

  // LINK-type content: raw URL — embed or open externally
  if (content.startsWith('http://') || content.startsWith('https://')) {
    return <LinkViewer url={content} />;
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-muted/10 flex justify-center py-6 px-4"
      >
        <div
          className="bg-white shadow-lg rounded-sm"
          style={{
            width: '760px',
            transform: `scale(${documentZoom})`,
            transformOrigin: 'top center',
            minHeight: '1060px',
          }}
        >
          <AnnotatedDocumentViewer
            content={content}
            annotations={textAnnotations}
            focusedAnnotationId={focusedAnnotationId}
            onAnnotationClick={onAnnotationClick}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </div>

      {pendingSelection && !showForm && (
        <SelectionCommentButton
          position={pendingSelection}
          onAddComment={handleAddCommentClick}
        />
      )}
      {showForm && pendingSelection && (
        <CommentForm
          position={pendingSelection}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
          defaultLayer={defaultAnnotationLayer}
        />
      )}
    </div>
  );
}
