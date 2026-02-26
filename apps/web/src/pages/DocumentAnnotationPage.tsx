import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { AnnotatedDocumentViewer } from '@/components/annotation/AnnotatedDocumentViewer';
import { WordCommentPanel } from '@/components/annotation/WordCommentPanel';
import { CommentForm } from '@/components/annotation/CommentForm';
import { SelectionCommentButton } from '@/components/annotation/SelectionCommentButton';
import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useDocumentUIStore } from '@/lib/store';
import { DocumentToolbar } from '@/pages/DocumentAnnotationPage.toolbar';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
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

  const { documentZoom, setDocumentZoom, setAnnotationPanelWidth } = useDocumentUIStore();

  const {
    textAnnotations,
    allAnnotations,
    focusedAnnotationId,
    setFocusedAnnotationId,
    addTextAnnotation,
    fetching: annotationsFetching,
  } = useDocumentAnnotations(contentId);

  const [pendingSelection, setPendingSelection] = useState<SelectionState | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSelectionChange = useCallback((sel: SelectionState | null) => {
    setPendingSelection(sel);
    if (!sel) setShowForm(false);
  }, []);

  const handleAddCommentClick = useCallback((pos: { x: number; y: number }) => {
    setPendingSelection((prev) => (prev ? { ...prev, x: pos.x, y: pos.y } : null));
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    (text: string, layer: AnnotationLayer) => {
      if (!pendingSelection) return;
      void addTextAnnotation({ text, layer, from: pendingSelection.from, to: pendingSelection.to });
      setShowForm(false);
      setPendingSelection(null);
    },
    [pendingSelection, addTextAnnotation],
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  const fetching = result.fetching;
  const hasError = !!result.error;
  const item = result.data?.contentItem;

  if (fetching || annotationsFetching) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (hasError || !item) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Document not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
      <DocumentToolbar
        title={item.title ?? 'Document'}
        documentZoom={documentZoom}
        onZoomChange={setDocumentZoom}
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 overflow-hidden"
        onLayoutChange={(layout) => {
          const commentWidth = layout['comments'];
          if (commentWidth !== undefined) setAnnotationPanelWidth(commentWidth);
        }}
      >
        <ResizablePanel defaultSize={65} minSize={40} id="document">
          <div className="h-full overflow-y-auto bg-muted/20 flex justify-center py-8 px-4">
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
                content={item.content ?? ''}
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
        />
      )}
    </div>
  );
}
