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
import { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContentData } from '@/hooks/useContentData';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useAgentChat } from '@/hooks/useAgentChat';
import { mockBookmarks } from '@/lib/mock-content-data';
import { mockGraphData } from '@/lib/mock-graph-data';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import {
  LAYER_META,
  SPEED_OPTIONS,
  formatTime,
  highlightText,
} from './content-viewer.utils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
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
import { VideoProgressMarkers } from '@/components/VideoProgressMarkers';
import { AddAnnotationOverlay } from '@/components/AddAnnotationOverlay';
import { LayerToggleBar } from '@/components/LayerToggleBar';
import { AnnotationThread } from '@/components/AnnotationThread';
import { ContentViewerBreadcrumb } from '@/components/ContentViewerBreadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  // ── Video state ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ── Layer / annotation form state ──
  const [activeLayers, setActiveLayers] = useState<AnnotationLayer[]>([
    AnnotationLayer.PERSONAL,
    AnnotationLayer.SHARED,
    AnnotationLayer.INSTRUCTOR,
    AnnotationLayer.AI_GENERATED,
  ]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [newLayer, setNewLayer] = useState<AnnotationLayer>(AnnotationLayer.PERSONAL);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState('');

  // ── Refs for scroll sync ──
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
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

  const { messages: chatMessages, chatInput, setChatInput, sendMessage: sendChatMessage, chatEndRef, isStreaming } =
    useAgentChat(contentId);

  // useContentData does not expose bookmark data — the bookmarks field is not
  // part of the ContentItem schema in the current supergraph (tracked in
  // OPEN_ISSUES.md). Fall back to mockBookmarks until the backend exposes a
  // real bookmarks query/field.
  const bookmarks = mockBookmarks;

  // ── HLS adaptive streaming ──
  // Initialise (or re-initialise) HLS.js whenever the source URLs change.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || contentFetching) return;

    // Tear down any previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const effectiveUrl = hlsManifestUrl ?? videoUrl;
    const isHls = effectiveUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = effectiveUrl;
    } else {
      video.src = videoUrl;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl, hlsManifestUrl, contentFetching]);

  // ── Active transcript segment ──
  const activeSegment = transcript.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );

  // ── Video controls ──
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => console.warn('play failed:', err));
      }
    } else {
      videoRef.current.pause();
    }
    // Do NOT call setPlaying() here — onPlay/onPause events are the source of truth.
  };

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Keyboard shortcuts: Space=play/pause, ←/→=seek 5s
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        seekTo(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowRight') {
        seekTo(Math.min(duration, currentTime + 5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, seekTo]);

  // Auto-scroll transcript to active segment
  useEffect(() => {
    activeSegmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeSegment]);

  // Sync playback speed with video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

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
  const handleReply = (parentId: string, replyContent: string, replyLayer: AnnotationLayer) => {
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
      <ContentViewerBreadcrumb contentId={contentId} contentTitle={videoTitle} />

      {/* Error banners (non-blocking) */}
      {contentError && <ErrorBanner message={contentError} />}
      {annotError && <ErrorBanner message={annotError} />}

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-11rem)]">
        {/* ── LEFT: Video + Transcript ── */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3 overflow-hidden">
          {/* Video player */}
          <Card className="flex-shrink-0">
            <CardContent className="p-0">
              <div className="relative bg-black rounded-t-lg" style={{ aspectRatio: '16/9' }}>
                {contentFetching ? (
                  <SkeletonLine className="w-full h-full rounded-t-lg" />
                ) : (
                  <video
                    ref={videoRef}
                    className="w-full h-full rounded-t-lg"
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                  />
                )}
                {/* Bookmark markers */}
                {duration > 0 &&
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="absolute bottom-8 w-2 h-2 rounded-full cursor-pointer z-10"
                      style={{
                        left: `${(bm.timestamp / duration) * 100}%`,
                        backgroundColor: bm.color ?? '#3b82f6',
                      }}
                      title={bm.label}
                      onClick={() => seekTo(bm.timestamp)}
                    />
                  ))}

                <AddAnnotationOverlay currentTime={currentTime} onSave={handleOverlayAnnotation} />
              </div>

              {/* Controls */}
              <div className="px-3 py-2 flex items-center gap-3 bg-muted/40 rounded-b-lg">
                <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{playing ? t('content:pause') : t('content:play')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !muted;
                          setMuted(!muted);
                        }
                      }}
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{muted ? t('content:unmute') : t('content:mute')}</TooltipContent>
                </Tooltip>
                {/* Seek bar with annotation markers */}
                <div
                  className="flex-1 relative h-2 bg-muted rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seekTo(((e.clientX - rect.left) / rect.width) * duration);
                  }}
                >
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                  <VideoProgressMarkers annotations={annotations} duration={duration} onSeek={seekTo} />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => videoRef.current?.requestFullscreen()}
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('content:fullscreen')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        const idx = SPEED_OPTIONS.indexOf(playbackSpeed as (typeof SPEED_OPTIONS)[number]);
                        setPlaybackSpeed(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length] ?? 1);
                      }}
                      className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors min-w-[2.5rem] text-center"
                    >
                      {playbackSpeed}×
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('content:playbackSpeed')}</TooltipContent>
                </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> {t('content:transcript')}
              </span>
              {contentFetching ? (
                <SkeletonLine className="h-3 w-32" />
              ) : (
                <span className="text-xs text-muted-foreground">{videoTitle}</span>
              )}
            </div>
            <div
              ref={transcriptContainerRef}
              className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
            >
              {contentFetching
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-2">
                      <SkeletonLine className="h-3 w-10 flex-shrink-0" />
                      <SkeletonLine className="h-3 flex-1" />
                    </div>
                  ))
                : transcript.map((seg, idx) => (
                    <div
                      key={seg.id}
                      ref={idx === activeSegment ? activeSegmentRef : null}
                      onClick={() => seekTo(seg.startTime)}
                      className={`flex gap-3 p-2 rounded-md cursor-pointer transition-colors text-sm
                        ${idx === activeSegment ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/60'}`}
                    >
                      <span className="text-xs text-muted-foreground tabular-nums pt-0.5 flex-shrink-0 w-10">
                        {formatTime(seg.startTime)}
                      </span>
                      <span className={idx === activeSegment ? 'font-medium' : ''}>
                        {highlightText(seg.text, searchQuery)}
                      </span>
                    </div>
                  ))}
            </div>
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
              <LayerToggleBar activeLayers={activeLayers} onToggle={toggleLayer} />
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
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddAnnotation}>
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
                <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7">
                  {t('content:exploreFullGraph')} <ChevronRight className="h-3 w-3 ml-1" />
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
                  <Button size="sm" className="h-8 w-8 p-0" onClick={() => setSearchQuery('')}>
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
                {searchQuery.trim().length > 1 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {[
                      ...transcript
                        .filter((s) => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((s) => ({ type: 'transcript', id: s.id, text: s.text, ts: s.startTime })),
                      ...annotations
                        .filter((a) => a.content.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((a) => ({ type: 'annotation', id: a.id, text: a.content, ts: a.contentTimestamp })),
                      ...mockGraphData.nodes
                        .filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((n) => ({ type: 'concept', id: n.id, text: n.label, ts: undefined })),
                    ].map((r) => (
                      <div
                        key={r.id}
                        onClick={() => r.ts !== undefined && seekTo(r.ts)}
                        className="text-xs p-1.5 rounded border bg-muted/30 cursor-pointer hover:bg-muted/60 truncate"
                      >
                        <span className="font-medium text-muted-foreground mr-1">
                          {r.type === 'transcript' ? '📝' : r.type === 'annotation' ? '💬' : '🔵'}
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
                <p className="text-sm font-semibold">{t('content:chavrutaAi')}</p>
                <p className="text-xs text-muted-foreground">{t('content:dialecticalPartner')}</p>
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
              {['Debate free will', 'Quiz me', 'Summarize', 'Explain Rambam'].map((prompt) => (
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
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isStreaming && handleSendChat()}
                placeholder={isStreaming ? t('content:agentResponding') : t('content:askOrDebate')}
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
