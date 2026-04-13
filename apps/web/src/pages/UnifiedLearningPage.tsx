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
import { PageHeader } from '@/components/PageHeader';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useContentData } from '@/hooks/useContentData';
import { useSubtitleTracks } from '@/hooks/useSubtitleTracks';
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
import VisualSidebar from '@/components/visual-anchoring/VisualSidebar';
import { useAnchorDetection } from '@/hooks/useAnchorDetection';
import { useTimestampAnchorDetection } from '@/hooks/useTimestampAnchorDetection';
import { useEnrichedLesson } from '@/hooks/useEnrichedLesson';
import { GET_VISUAL_ANCHORS } from '@/components/visual-anchoring/visual-anchor.graphql';
import type { VisualAnchor } from '@/components/visual-anchoring/visual-anchor.types';
import { ResumeBanner } from '@/pages/ResumeBanner';

const DOC_TYPES = new Set(['MARKDOWN', 'PDF', 'RICH_DOCUMENT']);

interface ContentItemResult {
  contentItem: {
    id: string;
    title: string;
    contentType: string;
    content: string | null;
  } | null;
}

interface VisualAnchorsResult {
  getVisualAnchors: VisualAnchor[];
}

export function UnifiedLearningPage() {
  const { contentId = 'b0000000-0000-0000-0000-000000000001' } = useParams<{
    contentId: string;
  }>();
  const [searchParams] = useSearchParams();

  // Mounted guard: prevent urql cache dispatch during sibling route render
  // (/learn/:contentId and /document/:contentId both render this component).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Responsive layout: stack panels vertically on mobile (< 768px)
  const isMobile = useMediaQuery('(max-width: 767px)');

  // ── Content item query (contentType + document content) ──
  const [itemResult] = useQuery<ContentItemResult>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: !mounted || !contentId,
  });
  const item = itemResult.data?.contentItem;
  const contentType = item?.contentType ?? '';
  const isDocumentContent = DOC_TYPES.has(contentType.toUpperCase());

  // Fallback document content when gateway offline
  const rawDocumentContent: string =
    item?.content ?? (itemResult.error ? mockDocumentContent : '');

  // ── Video / transcript hook (has mock fallback) ──
  // NOTE: when contentId is a lessonId (not a contentItem ID), useContentData
  // returns null for the item and falls back to mock data. We override
  // youtubeVideoId / isYouTubeContent below using enrichedLesson data.
  const {
    videoUrl,
    hlsManifestUrl,
    videoTitle,
    transcript,
    youtubeVideoId: contentYoutubeVideoId,
    isYouTubeContent: contentIsYouTube,
  } = useContentData(contentId);

  // ── Enriched lesson data — always fetch; provides youtubeVideoId for lessons ──
  // The /learn/:contentId route may receive a lessonId (not a contentItem ID).
  // useContentData may return isYouTubeContent=false when the contentItem query
  // returns null. We fetch enrichedLesson unconditionally and use its
  // youtubeVideoId as a fallback detection mechanism.
  const enrichedLesson = useEnrichedLesson(contentId);

  // Merge YouTube detection: prefer contentItem result, fall back to enrichedLesson.
  const youtubeVideoId =
    contentYoutubeVideoId ?? enrichedLesson.data?.youtubeVideoId ?? null;
  const isYouTubeContent = contentIsYouTube || !!youtubeVideoId;

  // When contentId is an enrichedLesson ID (not a contentItem ID), item is null
  // and rawDocumentContent is ''. Synthesise markdown from enriched blocks so the
  // document panel renders lesson content instead of "אין מסמך לתוכן זה".
  const enrichedMarkdown: string = (() => {
    const blocks = enrichedLesson.data?.blocks;
    if (!blocks || blocks.length === 0) return '';
    return blocks
      .slice()
      .sort((a, b) => a.blockOrder - b.blockOrder)
      .map((b) => {
        const text = (b.content as Record<string, unknown>)['text'] as
          | string
          | undefined;
        if (!text) return '';
        if (b.blockType === 'HEADING') return `## ${text}`;
        return text;
      })
      .filter(Boolean)
      .join('\n\n');
  })();

  // Only use rawDocumentContent for true document types (MARKDOWN / PDF /
  // RICH_DOCUMENT). For YOUTUBE content items the `content` field holds the
  // video ID string — passing it to the document panel renders "3QTC00L1x1w"
  // as plain text. For all other cases (lesson IDs, unknown types) fall back
  // to the synthesised enrichedMarkdown from the enriched lesson blocks.
  const documentContent: string = isDocumentContent
    ? rawDocumentContent || enrichedMarkdown
    : enrichedMarkdown || (itemResult.error ? mockDocumentContent : '');

  // ── Subtitle tracks (empty array when query not available) ──
  const subtitleTracks = useSubtitleTracks(contentId);

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
  const { saveScrollPosition, isReturning, savedScrollY } =
    useDocumentScrollMemory(contentId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Resume banner (G-10) ──
  const [showResumeBanner, setShowResumeBanner] = useState(isReturning);

  const scrollToSaved = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: savedScrollY,
      behavior: 'smooth',
    });
  }, [savedScrollY]);

  // ── Video state (declared here so currentTime is available for anchor detection below) ──
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | undefined>();

  // ── Visual anchors ──
  const [anchorsResult] = useQuery<VisualAnchorsResult>({
    query: GET_VISUAL_ANCHORS,
    variables: { mediaAssetId: contentId },
    pause: !mounted || !contentId,
  });
  const visualAnchors: VisualAnchor[] =
    anchorsResult.data?.getVisualAnchors ?? [];
  const anchorPositions = visualAnchors.map((a) => ({
    id: a.id,
    documentOrder: a.documentOrder,
  }));
  const scrollAnchor = useAnchorDetection(anchorPositions, scrollContainerRef);
  // Timestamp-based anchor detection for enriched YouTube lessons
  const timestampAnchors = (enrichedLesson.data?.blocks ?? [])
    .filter((b) => b.blockType === 'VISUAL_ANCHOR' && b.anchor)
    .map((b) => ({
      id: b.anchor!.id,
      startTime: b.anchor!.startTime ?? null,
      endTime: b.anchor!.endTime ?? null,
      documentOrder: b.blockOrder,
    }));
  const tsAnchor = useTimestampAnchorDetection({
    anchors: timestampAnchors,
    currentTime,
  });
  // Use timestamp-based detection for YouTube content, scroll-based otherwise
  const activeAnchorId = isYouTubeContent
    ? tsAnchor.activeAnchorId
    : scrollAnchor.activeAnchorId;
  const activeAnchor = visualAnchors.find((a) => a.id === activeAnchorId);

  // ── Document zoom ──
  const { documentZoom, defaultAnnotationLayer } = useDocumentUIStore();

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

  const title = item?.title ?? enrichedLesson.data?.lesson?.title ?? videoTitle;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      saveScrollPosition(e.currentTarget.scrollTop);
    },
    [saveScrollPosition]
  );

  return (
    <Layout>
      {showResumeBanner && activeAnchorId && (
        <ResumeBanner
          activeAnchor={activeAnchor}
          onResume={() => {
            scrollToSaved();
            setShowResumeBanner(false);
          }}
          onDismiss={() => setShowResumeBanner(false)}
        />
      )}
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-2">
          <PageHeader
            title={title ?? 'Learning'}
            breadcrumbs={[
              { label: 'Courses', href: '/courses' },
              { label: title ?? 'Content' },
            ]}
            className="mb-0"
          />
        </div>

        {/* Main resizable layout with visual sidebar */}
        <div className="flex flex-1 overflow-hidden">
          <VisualSidebar
            anchors={visualAnchors}
            activeAnchorId={activeAnchorId}
            currentTime={isYouTubeContent ? currentTime : undefined}
          />
          <ResizablePanelGroup
            orientation={isMobile ? 'vertical' : 'horizontal'}
            className="flex-1 overflow-hidden border rounded-lg"
          >
            {/* LEFT (desktop) / TOP (mobile) — Document */}
            <ResizablePanel
              defaultSize={isMobile ? 50 : 55}
              minSize={isMobile ? 30 : 25}
              id="document"
            >
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

            {/* RIGHT (desktop) / BOTTOM (mobile) — Video + Transcript + Tabs */}
            <ResizablePanel
              defaultSize={isMobile ? 50 : 45}
              minSize={isMobile ? 30 : 25}
              id="tools"
            >
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
                subtitleTracks={subtitleTracks}
                youtubeVideoId={youtubeVideoId}
                enrichedBlocks={enrichedLesson.data?.blocks ?? []}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </Layout>
  );
}
