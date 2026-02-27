import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { toast } from 'sonner';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { AnnotatedDocumentViewer } from '@/components/annotation/AnnotatedDocumentViewer';
import { WordCommentPanel } from '@/components/annotation/WordCommentPanel';
import { CommentForm } from '@/components/annotation/CommentForm';
import { SelectionCommentButton } from '@/components/annotation/SelectionCommentButton';
import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useDocumentScrollMemory } from '@/hooks/useDocumentScrollMemory';
import { useRecentDocuments } from '@/hooks/useRecentDocuments';
import { useDocumentUIStore } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { DocumentToolbar } from '@/pages/DocumentAnnotationPage.toolbar';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import { mockDocumentContent } from '@/lib/mock-content-data';
import type { AnnotationLayer } from '@/types/annotations';

interface ContentItemResult {
  contentItem: {
    id: string;
    title: string;
    contentType: string;
    content: string | null;
  } | null;
}

interface SelectionState {
  x: number;
  y: number;
  from: number;
  to: number;
}

export function DocumentAnnotationPage() {
  const { contentId = '' } = useParams<{ contentId: string }>();

  const [result] = useQuery<ContentItemResult>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: !contentId,
  });

  const {
    documentZoom,
    setDocumentZoom,
    setAnnotationPanelWidth,
    defaultAnnotationLayer,
    setDefaultAnnotationLayer,
  } = useDocumentUIStore();

  const {
    textAnnotations,
    allAnnotations,
    focusedAnnotationId,
    setFocusedAnnotationId,
    addTextAnnotation,
    fetching: annotationsFetching,
  } = useDocumentAnnotations(contentId);

  // Scroll memory — must be called unconditionally (before early returns)
  const { isReturning, savedScrollY, saveScrollPosition } =
    useDocumentScrollMemory(contentId);
  const { addRecentDocument } = useRecentDocuments();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const welcomeShownRef = useRef(false);

  const [pendingSelection, setPendingSelection] =
    useState<SelectionState | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetching = result.fetching;
  const item = result.data?.contentItem;

  // Track document in recent list + show welcome-back toast + restore scroll
  useEffect(() => {
    if (fetching || (!item && !result.error)) return;
    const title = item?.title ?? 'נהר שלום — פנינים מאוץ';

    // Track in recently viewed
    addRecentDocument(contentId, title);

    // Welcome back toast + scroll restore (run once per mount)
    if (isReturning && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      const user = getCurrentUser();
      const name = user?.firstName ?? '';
      toast(`ברוך הבא${name ? `, ${name}` : ''}!`, {
        description: `ממשיך מהמקום שעצרת ב"${title}"`,
        duration: 4000,
      });
      const timer = setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: savedScrollY,
          behavior: 'smooth',
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [item?.id, fetching, result.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      saveScrollPosition(e.currentTarget.scrollTop);
    },
    [saveScrollPosition]
  );

  const handleSelectionChange = useCallback((sel: SelectionState | null) => {
    setPendingSelection(sel);
    if (!sel) setShowForm(false);
  }, []);

  const handleAddCommentClick = useCallback((pos: { x: number; y: number }) => {
    setPendingSelection((prev) =>
      prev ? { ...prev, x: pos.x, y: pos.y } : null
    );
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    (text: string, layer: AnnotationLayer) => {
      if (!pendingSelection) return;
      void addTextAnnotation({
        text,
        layer,
        from: pendingSelection.from,
        to: pendingSelection.to,
      });
      setShowForm(false);
      setPendingSelection(null);
    },
    [pendingSelection, addTextAnnotation]
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  if (fetching || annotationsFetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Fallback to mock document when gateway is offline (dev mode)
  const effectiveItem = item ?? (result.error
    ? { id: contentId, title: 'נהר שלום — פנינים מאוץ (הדגמה)', contentType: 'RICH_DOCUMENT', content: mockDocumentContent }
    : null);

  if (!effectiveItem) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Document not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
      <DocumentToolbar
        title={effectiveItem.title ?? 'Document'}
        documentZoom={documentZoom}
        onZoomChange={setDocumentZoom}
        defaultAnnotationLayer={defaultAnnotationLayer}
        onDefaultLayerChange={setDefaultAnnotationLayer}
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 overflow-hidden"
        onLayoutChange={(layout: Record<string, number>) => {
          const commentWidth = layout['comments'];
          if (commentWidth !== undefined) setAnnotationPanelWidth(commentWidth);
        }}
      >
        <ResizablePanel defaultSize={65} minSize={40} id="document">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto bg-muted/20 flex justify-center py-8 px-4"
          >
            <div
              className="bg-white shadow-xl rounded-sm"
              style={{
                width: '794px',
                transform: `scale(${documentZoom})`,
                transformOrigin: 'top center',
                minHeight: '1123px',
              }}
            >
              <AnnotatedDocumentViewer
                content={effectiveItem.content ?? ''}
                annotations={textAnnotations}
                focusedAnnotationId={focusedAnnotationId}
                onAnnotationClick={setFocusedAnnotationId}
                onSelectionChange={handleSelectionChange}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={35} minSize={20} id="comments">
          <WordCommentPanel
            annotations={allAnnotations}
            focusedAnnotationId={focusedAnnotationId}
            onFocusAnnotation={setFocusedAnnotationId}
            onAddComment={() => {
              if (pendingSelection) handleAddCommentClick(pendingSelection);
            }}
            selectionActive={!!pendingSelection && !showForm}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

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
          onCancel={handleFormCancel}
          defaultLayer={defaultAnnotationLayer}
        />
      )}
    </div>
  );
}
