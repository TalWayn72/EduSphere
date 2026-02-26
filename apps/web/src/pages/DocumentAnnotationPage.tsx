import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { toast } from 'sonner';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

import { AnnotatedDocumentViewer } from '@/components/annotation/AnnotatedDocumentViewer';
import { SelectionCommentButton } from '@/components/annotation/SelectionCommentButton';
import { CommentForm } from '@/components/annotation/CommentForm';
import { WordCommentPanel } from '@/components/annotation/WordCommentPanel';
import { DocumentAnnotationToolbar } from './DocumentAnnotationPage.toolbar';
import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useDocumentScrollMemory } from '@/hooks/useDocumentScrollMemory';
import { useRecentDocuments } from '@/hooks/useRecentDocuments';
import { useDocumentUIStore } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import type { AnnotationLayer } from '@/types/annotations';
import type { SelectionPosition } from '@/components/annotation/AnnotatedDocumentViewer';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';

export function DocumentAnnotationPage() {
  const { contentId = '' } = useParams<{ contentId: string }>();

  const [{ data, fetching }] = useQuery({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: !contentId,
  });

  const item = data?.contentItem;

  const { allAnnotations, textAnnotations, addTextAnnotation } =
    useDocumentAnnotations(contentId);

  const { isReturning, savedScrollY, saveScrollPosition } =
    useDocumentScrollMemory(contentId);
  const { addRecentDocument } = useRecentDocuments();

  const {
    documentZoom,
    defaultAnnotationLayer,
    setDocumentZoom,
    setDefaultAnnotationLayer,
    annotationPanelWidth,
    setAnnotationPanelWidth,
  } = useDocumentUIStore();

  const [selection, setSelection] = useState<{
    range: { from: number; to: number };
    position: SelectionPosition;
  } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const welcomeShownRef = useRef(false);

  // Track document visit + show welcome-back toast + restore scroll
  useEffect(() => {
    if (!item || fetching) return;

    addRecentDocument(contentId, item.title ?? 'Document');

    if (isReturning && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      const user = getCurrentUser();
      const name = user?.firstName ?? '';
      toast(`ברוך הבא${name ? `, ${name}` : ''}!`, {
        description: `ממשיך מהמקום שעצרת ב"${item.title ?? 'המסמך'}"`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, fetching]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) saveScrollPosition(el.scrollTop);
  }, [saveScrollPosition]);

  const handleSelectionChange = useCallback(
    (
      range: { from: number; to: number } | null,
      position: SelectionPosition | null
    ) => {
      if (range && position) {
        setSelection({ range, position });
        setShowForm(false);
      } else {
        setSelection(null);
        setShowForm(false);
      }
    },
    []
  );

  const handleAddComment = useCallback(() => {
    if (selection) setShowForm(true);
  }, [selection]);

  const handleFormSubmit = useCallback(
    async (text: string, layer: AnnotationLayer) => {
      if (!selection) return;
      await addTextAnnotation(text, layer, selection.range);
      setShowForm(false);
      setSelection(null);
    },
    [selection, addTextAnnotation]
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleLayoutChange = useCallback(
    (layout: Record<string, number>) => {
      const panelWidth = Object.values(layout)[1];
      if (typeof panelWidth === 'number') {
        setAnnotationPanelWidth(panelWidth);
      }
    },
    [setAnnotationPanelWidth]
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <DocumentAnnotationToolbar
        title={item?.title ?? 'Loading…'}
        documentZoom={documentZoom}
        onZoomChange={setDocumentZoom}
        defaultAnnotationLayer={defaultAnnotationLayer}
        onDefaultLayerChange={setDefaultAnnotationLayer}
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 min-h-0"
        onLayoutChange={handleLayoutChange}
      >
        {/* Document panel */}
        <ResizablePanel
          id="document"
          defaultSize={100 - annotationPanelWidth}
          minSize={30}
        >
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto relative"
          >
            <div className="max-w-3xl mx-auto px-6 py-8">
              {item?.content ? (
                <AnnotatedDocumentViewer
                  content={item.content}
                  annotations={textAnnotations}
                  onSelectionChange={handleSelectionChange}
                  zoom={documentZoom}
                />
              ) : fetching ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-20">
                  Document not found.
                </p>
              )}
            </div>
          </div>

          {/* Floating add-comment button */}
          {!showForm && (
            <SelectionCommentButton
              position={selection?.position ?? null}
              onAddComment={handleAddComment}
            />
          )}

          {/* Comment form */}
          {showForm && selection && (
            <CommentForm
              position={selection.position}
              defaultLayer={defaultAnnotationLayer}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Comments panel */}
        <ResizablePanel
          id="comments"
          defaultSize={annotationPanelWidth}
          minSize={20}
        >
          <WordCommentPanel
            annotations={allAnnotations}
            selectionActive={!!selection && !showForm}
            onAddComment={handleAddComment}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
