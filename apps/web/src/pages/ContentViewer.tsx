/**
 * ContentViewer — main learning interface.
 *
 * EXCEPTION NOTE (150-line rule): This component intentionally exceeds the 150-line
 * limit because it orchestrates 4 tightly coupled concerns:
 *   1. HTML5 video player (keyboard shortcuts, seek bar, playback speed)
 *   2. Transcript sync (auto-scroll, highlight search terms)
 *   3. Annotation layers (CRUD, layer toggle, optimistic updates, threading)
 *   4. AI Chavruta chat (session management, Chavruta responses)
 * Data fetching and AI chat logic live in dedicated hooks (hooks/use*.ts).
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContentData } from '@/hooks/useContentData';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useAgentChat } from '@/hooks/useAgentChat';
import { mockGraphData } from '@/lib/mock-graph-data';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import { LAYER_META, formatTime } from './content-viewer.utils';
import {
  FileText,
  Network,
  Search,
  BookOpen,
  Bot,
  ChevronRight,
  Plus,
  Send,
  AlertCircle,
} from 'lucide-react';
import { VideoPlayerCore } from '@/components/VideoPlayerCore';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { VideoProgressMarkers } from '@/components/VideoProgressMarkers';
import { AddAnnotationOverlay } from '@/components/AddAnnotationOverlay';
import { LayerToggleBar } from '@/components/LayerToggleBar';
import { AnnotationThread } from '@/components/AnnotationThread';
import { ContentViewerBreadcrumb } from '@/components/ContentViewerBreadcrumb';
import { useQuery } from 'urql';
import { LiveSessionCard } from '@/components/LiveSessionCard';
import { LIVE_SESSION_QUERY } from '@/lib/graphql/live-session.queries';
import { ScenarioPlayer } from '@/components/ScenarioPlayer';
import { useScenarioNode } from '@/hooks/useScenarioNode';
// ─── Skeleton helpers ──────────────────────────────────────────────────────────

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded ${className}`}
      aria-hidden="true"
    />
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-md">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message} — showing cached data.
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ContentViewer() {
  const { t } = useTranslation(['content', 'common']);
  const { contentId = 'content-1' } = useParams<{ contentId: string }>();

  // Phase B: When locale !== 'en', display translation status badge
  // const locale = i18n.language;
  // const showTranslationBadge = locale !== 'en';

  // ── Video state (managed by VideoPlayerCore; we only track time for transcript) ──
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  /** Seek target forwarded to VideoPlayerCore on transcript click. */
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
  // This replaces the hardcoded mockBookmarks (BUG-16) with persisted data.
  const bookmarks = annotations
    .filter(
      (a) =>
        a.layer === AnnotationLayer.PERSONAL && a.contentTimestamp !== undefined
    )
    .map((a) => ({
      id: a.id,
      timestamp: a.contentTimestamp!,
      label: a.content.length > 60 ? a.content.slice(0, 57) + '…' : a.content,
      color: '#3b82f6',
    }));

  // ── Live session (LIVE_SESSION content type) ──
  const [liveSessionResult] = useQuery({
    query: LIVE_SESSION_QUERY,
    variables: { contentItemId: contentId },
    pause: true, // liveSession not yet in supergraph — BUG-027
  });
  const liveSession = liveSessionResult.data?.liveSession ?? null;
  // ── Scenario node (SCENARIO content type) ──
  const { scenarioNode } = useScenarioNode(contentId, false); // scenarioNode not yet in supergraph — BUG-027

  // ── Seek callback (from transcript click / ?t= param) ──
  const seekTo = useCallback((time: number) => {
    setSeekTarget(time);
    setCurrentTime(time);
  }, []);

  // Jump to ?t= URL param on mount
  useEffect(() => {
    const t = searchParams.get('t');
    if (t) seekTo(parseFloat(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLayer = (layer: AnnotationLayer) => {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  // ── Add annotation ──
  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return;
    addAnnotation(newAnnotation, newLayer, currentTime);
    setNewAnnotation('');
    setShowAnnotationForm(false);
  };

  // ── Add annotation from video overlay ──
  const handleOverlayAnnotation = (
    content: string,
    layer: AnnotationLayer,
    timestamp: number
  ) => {
    void addAnnotation(content, layer, timestamp);
  };

  // ── Reply to an annotation ──
  const handleReply = (
    parentId: string,
    replyContent: string,
    replyLayer: AnnotationLayer
  ) => {
    void addReply(parentId, replyContent, replyLayer, currentTime);
  };

  // ── AI Chat send handler ──
  const handleSendChat = () => {
    void sendChatMessage();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Breadcrumb + prev/next navigation */}
      <ContentViewerBreadcrumb
        contentId={contentId}
        contentTitle={videoTitle}
      />

      {/* Error banners (non-blocking) */}
      {contentError && <ErrorBanner message={contentError} />}
      {annotError && <ErrorBanner message={annotError} />}

      {/* Live Session card — shown for LIVE_SESSION content type */}
      {liveSession && (
        <div className="mb-4">
          <LiveSessionCard liveSession={liveSession} />
        </div>
      )}
      {/* Scenario player — shown for SCENARIO content type */}
      {scenarioNode && (
        <div className="mb-4">
          <ScenarioPlayer
            rootContentItemId={contentId}
            initialNode={scenarioNode}
          />
        </div>
      )}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-11rem)]">
        {/* ── LEFT: Video + Transcript ── */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3 overflow-hidden">
          {/* Video player — VideoPlayerCore (HLS + quality selector + PiP) */}
          <Card className="flex-shrink-0">
            <CardContent className="p-0">
              {contentFetching ? (
                <div
                  className="w-full bg-muted animate-pulse rounded-lg"
                  style={{ aspectRatio: '16/9' }}
                  aria-hidden="true"
                />
              ) : (
                <div className="relative">
                  <VideoPlayerCore
                    src={videoUrl}
                    hlsSrc={hlsManifestUrl}
                    bookmarks={bookmarks}
                    seekTo={seekTarget}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setDuration}
                  />
                  {/* Annotation markers overlay (above video controls) */}
                  <div className="absolute bottom-12 left-0 right-0 pointer-events-none">
                    <VideoProgressMarkers
                      annotations={annotations}
                      duration={duration}
                      onSeek={seekTo}
                    />
                  </div>
                  <AddAnnotationOverlay
                    currentTime={currentTime}
                    onSave={handleOverlayAnnotation}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript — TranscriptPanel (auto-scroll + search + click-to-seek) */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> {t('content:transcript')}
              </span>
              {contentFetching ? (
                <SkeletonLine className="h-3 w-32" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {videoTitle}
                </span>
              )}
            </div>
            {contentFetching ? (
              <div className="flex-1 overflow-hidden px-4 py-2 space-y-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-2">
                    <SkeletonLine className="h-3 w-10 flex-shrink-0" />
                    <SkeletonLine className="h-3 flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <TranscriptPanel
                  segments={transcript}
                  currentTime={currentTime}
                  onSeek={seekTo}
                />
              </div>
            )}
          </Card>
        </div>

        {/* ── MIDDLE: Annotations ── */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {t('common:annotations')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAnnotationForm(!showAnnotationForm)}
                >
                  <Plus className="h-3 w-3 mr-1" /> {t('common:add')}
                </Button>
              </div>
              <LayerToggleBar
                activeLayers={activeLayers}
                onToggle={toggleLayer}
              />
            </div>

            {/* Add annotation form */}
            {showAnnotationForm && (
              <div className="px-4 py-3 border-b bg-muted/30 space-y-2">
                <div className="flex gap-2">
                  {(Object.keys(LAYER_META) as AnnotationLayer[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setNewLayer(l)}
                      className={`px-2 py-0.5 rounded text-xs border ${LAYER_META[l]?.bg ?? ''} ${LAYER_META[l]?.color ?? ''}
                        ${newLayer === l ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-60'}`}
                    >
                      {LAYER_META[l]?.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  placeholder={t('content:annotationPlaceholder')}
                  className="w-full text-sm px-3 py-2 border rounded-md bg-background resize-none"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setShowAnnotationForm(false)}
                  >
                    {t('common:cancel')}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddAnnotation}
                  >
                    {t('content:saveAt', { time: formatTime(currentTime) })}
                  </Button>
                </div>
              </div>
            )}

            {/* Annotations list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {annotFetching && annotations.length === 0
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-1.5 p-3 border rounded-lg">
                      <SkeletonLine className="h-3 w-24" />
                      <SkeletonLine className="h-3 w-full" />
                      <SkeletonLine className="h-3 w-3/4" />
                    </div>
                  ))
                : null}
              {!annotFetching && annotations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {t('content:noAnnotationsVisible')}
                </p>
              )}
              {annotations.map((ann: Annotation) => (
                <AnnotationThread
                  key={ann.id}
                  annotation={ann}
                  onSeek={seekTo}
                  onReply={handleReply}
                />
              ))}
            </div>
          </Card>

          {/* Knowledge Graph preview */}
          <Card className="flex-shrink-0">
            <Tabs defaultValue="graph">
              <TabsList className="w-full rounded-none border-b bg-transparent px-2 h-9">
                <TabsTrigger value="graph" className="text-xs flex-1">
                  <Network className="h-3 w-3 mr-1" />
                  {t('common:graph')}
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs flex-1">
                  <Search className="h-3 w-3 mr-1" />
                  {t('common:search')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="graph" className="m-0 px-4 py-3">
                <div className="grid grid-cols-2 gap-2">
                  {mockGraphData.nodes.slice(0, 4).map((node) => (
                    <div
                      key={node.id}
                      className="p-2 border rounded-md text-xs hover:bg-muted/50 cursor-pointer flex items-center gap-1.5"
                    >
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          node.type === 'CONCEPT'
                            ? 'bg-blue-500'
                            : node.type === 'PERSON'
                              ? 'bg-green-500'
                              : node.type === 'SOURCE'
                                ? 'bg-purple-500'
                                : 'bg-orange-500'
                        }`}
                      />
                      <span className="truncate font-medium">{node.label}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs h-7"
                >
                  {t('content:exploreFullGraph')}{' '}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </TabsContent>
              <TabsContent value="search" className="m-0 px-4 py-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('content:searchTranscript')}
                    className="flex-1 text-xs px-3 py-1.5 border rounded-md bg-background"
                  />
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
                {searchQuery.trim().length > 1 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {[
                      ...transcript
                        .filter((s) =>
                          s.text
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((s) => ({
                          type: 'transcript',
                          id: s.id,
                          text: s.text,
                          ts: s.startTime,
                        })),
                      ...annotations
                        .filter((a) =>
                          a.content
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((a) => ({
                          type: 'annotation',
                          id: a.id,
                          text: a.content,
                          ts: a.contentTimestamp,
                        })),
                      ...mockGraphData.nodes
                        .filter((n) =>
                          n.label
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((n) => ({
                          type: 'concept',
                          id: n.id,
                          text: n.label,
                          ts: undefined,
                        })),
                    ].map((r) => (
                      <div
                        key={r.id}
                        onClick={() => r.ts !== undefined && seekTo(r.ts)}
                        className="text-xs p-1.5 rounded border bg-muted/30 cursor-pointer hover:bg-muted/60 truncate"
                      >
                        <span className="font-medium text-muted-foreground mr-1">
                          {r.type === 'transcript'
                            ? '📝'
                            : r.type === 'annotation'
                              ? '💬'
                              : '🔵'}
                        </span>
                        {r.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t('content:searchTranscriptHint')}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* ── RIGHT: AI Chavruta Chat ── */}
        <div className="col-span-12 lg:col-span-3 flex flex-col overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b flex items-center gap-2 flex-shrink-0">
              <Bot className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">
                  {t('content:chavrutaAi')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('content:dialecticalPartner')}
                </p>
              </div>
              <div className="ml-auto flex gap-1">
                {['CHAVRUTA', 'QUIZ', 'EXPLAIN'].map((mode) => (
                  <span
                    key={mode}
                    className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                  >
                    {mode}
                  </span>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed
                    ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg rounded-bl-none px-4 py-3 flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-4 py-2 border-t border-b flex gap-2 overflow-x-auto flex-shrink-0">
              {[
                'Debate free will',
                'Quiz me',
                'Summarize',
                'Explain Rambam',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setChatInput(prompt)}
                  className="text-xs px-2 py-1 rounded-full border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 whitespace-nowrap transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 flex gap-2 flex-shrink-0">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !isStreaming &&
                  handleSendChat()
                }
                placeholder={
                  isStreaming
                    ? t('content:agentResponding')
                    : t('content:askOrDebate')
                }
                disabled={isStreaming}
                className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <Button
                size="sm"
                className="h-9 w-9 p-0 flex-shrink-0"
                onClick={handleSendChat}
                disabled={isStreaming}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
