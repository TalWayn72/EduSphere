/**
 * ContentViewer -- main learning interface (thin orchestrator).
 *
 * Heavy rendering is delegated to:
 *   - VideoSection (left column: video + transcript)
 *   - AnnotationsPanel (middle column: annotation CRUD + knowledge graph)
 *   - AiChatPanel (right column: AI Chavruta chat)
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { useContentData } from '@/hooks/useContentData';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useAgentChat } from '@/hooks/useAgentChat';
import { AnnotationLayer } from '@/types/annotations';
import { useQuery } from 'urql';
import { LiveSessionCard } from '@/components/LiveSessionCard';
import { LIVE_SESSION_QUERY } from '@/lib/graphql/live-session.queries';
import { ScenarioPlayer } from '@/components/ScenarioPlayer';
import { useScenarioNode } from '@/hooks/useScenarioNode';

import { ErrorBanner } from './ContentViewerHelpers';
import { VideoSection } from './VideoSection';
import { AnnotationsPanel } from './AnnotationsPanel';
import { AiChatPanel } from './AiChatPanel';

export function ContentViewer() {
  const { contentId = 'b0000000-0000-0000-0000-000000000001' } = useParams<{
    contentId: string;
  }>();

  // ── Video state ──
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | undefined>();

  // ── Layer / annotation form state ──
  const [activeLayers, setActiveLayers] = useState<AnnotationLayer[]>([
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [newLayer, setNewLayer] = useState<AnnotationLayer>(
    AnnotationLayer.PERSONAL
  );
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();

  // ── Data hooks ──
  const {
    videoUrl,
    hlsManifestUrl,
    videoTitle,
    transcript,
    fetching: contentFetching,
    error: contentError,
  } = useContentData(contentId);

  const {
    annotations,
    fetching: annotFetching,
    error: annotError,
    addAnnotation,
    addReply,
  } = useAnnotations(contentId, activeLayers);

  const {
    messages: chatMessages,
    chatInput,
    setChatInput,
    sendMessage: sendChatMessage,
    chatEndRef,
    isStreaming,
  } = useAgentChat(contentId);

  // Derive bookmarks from PERSONAL annotations that have a video timestamp.
  const bookmarks = useMemo(
    () =>
      annotations
        .filter(
          (a) =>
            a.layer === AnnotationLayer.PERSONAL &&
            a.contentTimestamp !== undefined
        )
        .map((a) => ({
          id: a.id,
          timestamp: a.contentTimestamp!,
          label:
            a.content.length > 60
              ? a.content.slice(0, 57) + '\u2026'
              : a.content,
          color: '#3b82f6',
        })),
    [annotations]
  );

  // ── Live session / scenario ──
  const [liveSessionResult] = useQuery({
    query: LIVE_SESSION_QUERY,
    variables: { contentItemId: contentId },
    pause: true,
  });
  const liveSession = liveSessionResult.data?.liveSession ?? null;
  const { scenarioNode } = useScenarioNode(contentId, false);

  // ── Callbacks ──
  const seekTo = useCallback((time: number) => {
    setSeekTarget(time);
    setCurrentTime(time);
  }, []);

  useEffect(() => {
    const t = searchParams.get('t');
    if (t) seekTo(parseFloat(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLayer = useCallback((layer: AnnotationLayer) => {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  }, []);

  const handleAddAnnotation = useCallback(() => {
    if (!newAnnotation.trim()) return;
    addAnnotation(newAnnotation, newLayer, currentTime);
    setNewAnnotation('');
    setShowAnnotationForm(false);
  }, [newAnnotation, newLayer, currentTime, addAnnotation]);

  const handleOverlayAnnotation = useCallback(
    (content: string, layer: AnnotationLayer, timestamp: number) => {
      void addAnnotation(content, layer, timestamp);
    },
    [addAnnotation]
  );

  const handleReply = useCallback(
    (parentId: string, replyContent: string, replyLayer: AnnotationLayer) => {
      void addReply(parentId, replyContent, replyLayer, currentTime);
    },
    [addReply, currentTime]
  );

  const handleSendChat = useCallback(() => {
    void sendChatMessage();
  }, [sendChatMessage]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <PageHeader
        title={videoTitle ?? 'Content'}
        breadcrumbs={[
          { label: 'Courses', href: '/courses' },
          { label: videoTitle ?? 'Content' },
        ]}
      />

      {contentError && <ErrorBanner message={contentError} />}
      {annotError && <ErrorBanner message={annotError} />}

      {liveSession && (
        <div className="mb-4">
          <LiveSessionCard liveSession={liveSession} />
        </div>
      )}
      {scenarioNode && (
        <div className="mb-4">
          <ScenarioPlayer
            rootContentItemId={contentId}
            initialNode={scenarioNode}
          />
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-11rem)]">
        <VideoSection
          videoUrl={videoUrl}
          hlsManifestUrl={hlsManifestUrl}
          videoTitle={videoTitle}
          contentFetching={contentFetching}
          transcript={transcript}
          currentTime={currentTime}
          duration={duration}
          seekTarget={seekTarget}
          bookmarks={bookmarks}
          annotations={annotations}
          onTimeUpdate={setCurrentTime}
          onDurationChange={setDuration}
          onSeek={seekTo}
          onOverlayAnnotation={handleOverlayAnnotation}
        />

        <AnnotationsPanel
          annotations={annotations}
          transcript={transcript}
          annotFetching={annotFetching}
          activeLayers={activeLayers}
          showAnnotationForm={showAnnotationForm}
          newAnnotation={newAnnotation}
          newLayer={newLayer}
          currentTime={currentTime}
          searchQuery={searchQuery}
          onToggleLayer={toggleLayer}
          onToggleForm={() => setShowAnnotationForm(!showAnnotationForm)}
          onNewAnnotationChange={setNewAnnotation}
          onNewLayerChange={setNewLayer}
          onAddAnnotation={handleAddAnnotation}
          onCloseForm={() => setShowAnnotationForm(false)}
          onSearchChange={setSearchQuery}
          onSeek={seekTo}
          onReply={handleReply}
        />

        <AiChatPanel
          chatMessages={chatMessages}
          chatInput={chatInput}
          isStreaming={isStreaming}
          chatEndRef={chatEndRef}
          onChatInputChange={setChatInput}
          onSendChat={handleSendChat}
        />
      </div>
    </Layout>
  );
}
