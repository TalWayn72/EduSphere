import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { AnnotatedDocumentViewer } from '@/components/annotation/AnnotatedDocumentViewer';
import { WordCommentPanel } from '@/components/annotation/WordCommentPanel';
import { SelectionCommentButton } from '@/components/annotation/SelectionCommentButton';
import { CommentForm } from '@/components/annotation/CommentForm';
import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useDocumentUIStore } from '@/lib/store';
import { DocumentToolbar } from '@/pages/DocumentAnnotationPage.toolbar';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import { AlertCircle } from 'lucide-react';
import type { AnnotationLayer } from '@/types/annotations';

interface ContentItemResult {
  contentItem: {
    id: string;
    title: string;
    contentType: string;
    content: string | null;
  } | null;
}

interface SelectionPosition {
  x: number;
  y: number;
  from: number;
  to: number;
}

function SkeletonBlock() {
  return (
    <div
      className="bg-muted animate-pulse rounded h-4 w-full"
      aria-hidden="true"
    />
  );
}

export function RichDocumentPage() {
  const { contentId = '' } = useParams<{ contentId: string }>();

  const [result] = useQuery<ContentItemResult>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: !contentId,
  });

  const {
    textAnnotations,
    allAnnotations,
    focusedAnnotationId,
    setFocusedAnnotationId,
    addTextAnnotation,
    fetching: annotationsFetching,
    error: annotationsError,
  } = useDocumentAnnotations(contentId);

  const {
    annotationPanelWidth,
    documentZoom,
    setDocumentZoom,
    defaultAnnotationLayer,
    setDefaultAnnotationLayer,
  } = useDocumentUIStore();

  // Text-selection state
  const [selectionPosition, setSelectionPosition] =
    useState<SelectionPosition | null>(null);
  const [pendingForm, setPendingForm] = useState<SelectionPosition | null>(
    null
  );

  const handleSelectionChange = useCallback((pos: SelectionPosition | null) => {
    setSelectionPosition(pos);
    if (pos) setPendingForm(null);
  }, []);

  const handleOpenCommentForm = useCallback(() => {
    if (selectionPosition) setPendingForm(selectionPosition);
  }, [selectionPosition]);

  const handleSubmitComment = useCallback(
    async (text: string, layer: AnnotationLayer) => {
      if (!pendingForm) return;
      await addTextAnnotation({
        text,
        layer,
        from: pendingForm.from,
        to: pendingForm.to,
      });
      setPendingForm(null);
      setSelectionPosition(null);
    },
    [pendingForm, addTextAnnotation]
  );

  const handleCancelComment = useCallback(() => {
    setPendingForm(null);
    setSelectionPosition(null);
  }, []);

  const item = result.data?.contentItem;
  const fetching = result.fetching;
  const hasError = !!result.error;

  // Suppress unused variable warnings — these come from useDocumentAnnotations
  void annotationsFetching;
  void annotationsError;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Toolbar */}
        <DocumentToolbar
          title={fetching ? '' : (item?.title ?? '')}
          documentZoom={documentZoom}
          onZoomChange={setDocumentZoom}
          defaultAnnotationLayer={defaultAnnotationLayer}
          onDefaultLayerChange={setDefaultAnnotationLayer}
        />

        {hasError && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load document. Please try again.
          </div>
        )}

        {fetching && !item && (
          <div className="mx-6 mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} />
            ))}
          </div>
        )}

        {item && (
          <ResizablePanelGroup
            orientation="horizontal"
            className="flex-1 min-h-0"
          >
            {/* Document panel */}
            <ResizablePanel
              defaultSize={100 - annotationPanelWidth}
              minSize={40}
            >
              <div className="h-full overflow-y-auto px-6 py-4">
                {item.contentType === 'RICH_DOCUMENT' && item.content ? (
                  <div
                    style={{
                      transform: `scale(${documentZoom})`,
                      transformOrigin: 'top left',
                      width: `${Math.round((1 / documentZoom) * 100)}%`,
                    }}
                  >
                    <AnnotatedDocumentViewer
                      content={item.content}
                      annotations={textAnnotations}
                      focusedAnnotationId={focusedAnnotationId}
                      onAnnotationClick={setFocusedAnnotationId}
                      onSelectionChange={handleSelectionChange}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No content available.
                  </p>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Comment panel */}
            <ResizablePanel
              defaultSize={annotationPanelWidth}
              minSize={20}
              maxSize={50}
            >
              <WordCommentPanel
                annotations={allAnnotations}
                focusedAnnotationId={focusedAnnotationId}
                onFocusAnnotation={setFocusedAnnotationId}
                onAddComment={handleOpenCommentForm}
                selectionActive={!!selectionPosition && !pendingForm}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Floating selection button */}
      {selectionPosition && !pendingForm && (
        <SelectionCommentButton
          position={selectionPosition}
          onAddComment={handleOpenCommentForm}
        />
      )}

      {/* Floating comment form */}
      {pendingForm && (
        <CommentForm
          position={pendingForm}
          onSubmit={handleSubmitComment}
          onCancel={handleCancelComment}
        />
      )}
    </Layout>
  );
}
