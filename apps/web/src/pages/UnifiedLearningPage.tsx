/**
 * UnifiedLearningPage — combined document + video + AI + annotations interface.
 *
 * Layout: left panel (document) | right panel (video + transcript + tabs).
 * All panels are resizable via drag handles.
 * Content type detection: MARKDOWN / PDF / RICH_DOCUMENT → document in left panel.
 * VIDEO / AUDIO / other → placeholder in left panel, video prominent in right top.
 *
 * EXCEPTION NOTE (150-line rule): Orchestrator file — wires multiple tightly
 * coupled hooks and delegates all rendering to sub-components.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ContentViewerBreadcrumb } from '@/components/ContentViewerBreadcrumb';
import { useContentData } from '@/hooks/useContentData';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useDocumentScrollMemory } from '@/hooks/useDocumentScrollMemory';
import { useDocumentUIStore } from '@/lib/store';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import { mockDocumentContent } from '@/lib/mock-content-data';
import { AnnotationLayer } from '@/types/annotations';
import { DocumentPanel } from '@/pages/UnifiedLearningPage.document-panel';
import { ToolsPanel } from '@/pages/UnifiedLearningPage.tools-panel';

const DOC_TYPES = new Set(['MARKDOWN', 'PDF', 'RICH_DOCUMENT']);

interface ContentItemResult {
  contentItem: {
    id: string;
    title: string;
    contentType: string;
    content: string | null;
  } | null;
}

export function UnifiedLearningPage() {
  const { contentId = 'content-1' } = useParams<{ contentId: string }>();
  const [searchParams] = useSearchParams();

  // ── Content item query (contentType + document content) ──
  const [itemResult] = useQuery<ContentItemResult>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: !contentId,
  });
  const item = itemResult.data?.contentItem;
  const contentType = item?.contentType ?? '';
  const isDocumentContent = DOC_TYPES.has(contentType.toUpperCase());

  // Fallback document content when gateway offline
  const documentContent: string =
    item?.content ?? (itemResult.error ? mockDocumentContent : '');

  // ── Video / transcript hook (has mock fallback) ──
  const { videoUrl, hlsManifestUrl, videoTitle, transcript } =
    useContentData(contentId);

  // ── Annotation hooks ──
  const [activeLayers] = useState<AnnotationLayer[]>([
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ]);

  const {
    annotations,
    fetching: annotFetching,
    addAnnotation,
    addReply,
  } = useAnnotations(contentId, activeLayers);

  const {
    textAnnotations,
    focusedAnnotationId,
    setFocusedAnnotationId,
    addTextAnnotation,
  } = useDocumentAnnotations(contentId);

  // ── AI Chat ──
  const chat = useAgentChat(contentId);

  // ── Document scroll memory ──
  const { saveScrollPosition } = useDocumentScrollMemory(contentId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Document zoom ──
  const { documentZoom, defaultAnnotationLayer } = useDocumentUIStore();

  // ── Video state ──
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | undefined>();

  const seekTo = useCallback((time: number) => {
    setSeekTarget(time);
    setCurrentTime(time);
  }, []);

  // Jump to ?t= URL param on mount
  useEffect(() => {
    const tParam = searchParams.get('t');
    if (tParam) seekTo(parseFloat(tParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive video bookmarks from PERSONAL annotations with timestamps
  const bookmarks = annotations
    .filter(
      (a) =>
        a.layer === AnnotationLayer.PERSONAL && a.contentTimestamp !== undefined
    )
    .map((a) => ({
      id: a.id,
      timestamp: a.contentTimestamp!,
      label: a.content.length > 50 ? a.content.slice(0, 47) + '…' : a.content,
      color: '#3b82f6',
    }));

  const title = item?.title ?? videoTitle;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      saveScrollPosition(e.currentTarget.scrollTop);
    },
    [saveScrollPosition]
  );

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Breadcrumb */}
        <div className="flex-shrink-0 px-1">
          <ContentViewerBreadcrumb contentId={contentId} contentTitle={title} />
        </div>

        {/* Main resizable layout */}
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1 overflow-hidden border rounded-lg"
        >
          {/* LEFT — Document */}
          <ResizablePanel defaultSize={55} minSize={25} id="document">
            <DocumentPanel
              content={documentContent}
              hasDocument={isDocumentContent || !!documentContent}
              textAnnotations={textAnnotations}
              focusedAnnotationId={focusedAnnotationId}
              onAnnotationClick={setFocusedAnnotationId}
              onAddTextAnnotation={(args) => {
                void addTextAnnotation(args);
              }}
              scrollContainerRef={scrollContainerRef}
              onScroll={handleScroll}
              documentZoom={documentZoom}
              defaultAnnotationLayer={defaultAnnotationLayer}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT — Video + Transcript + Tabs */}
          <ResizablePanel defaultSize={45} minSize={25} id="tools">
            <ToolsPanel
              videoUrl={videoUrl}
              hlsManifestUrl={hlsManifestUrl}
              transcript={transcript}
              annotations={annotations}
              annotationsFetching={annotFetching}
              currentTime={currentTime}
              duration={duration}
              seekTarget={seekTarget}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onSeek={seekTo}
              onAddAnnotation={(text, layer, time) => {
                void addAnnotation(text, layer, time);
              }}
              onReply={(pid, content, layer) => {
                void addReply(pid, content, layer, currentTime);
              }}
              onOverlayAnnotation={(content, layer, ts) => {
                void addAnnotation(content, layer, ts);
              }}
              bookmarks={bookmarks}
              chat={chat}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Layout>
  );
}
