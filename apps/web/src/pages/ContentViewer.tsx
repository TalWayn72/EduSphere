import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import {
  ANNOTATIONS_QUERY,
  CREATE_ANNOTATION_MUTATION,
} from '@/lib/graphql/annotation.queries';
import {
  START_AGENT_SESSION_MUTATION,
  SEND_AGENT_MESSAGE_MUTATION,
} from '@/lib/graphql/agent.queries';
import {
  mockVideo,
  mockTranscript,
  mockBookmarks,
  TranscriptSegment,
} from '@/lib/mock-content-data';
import {
  getThreadedAnnotations,
  filterAnnotationsByLayers,
} from '@/lib/mock-annotations';
import { mockGraphData } from '@/lib/mock-graph-data';
import { Annotation, AnnotationLayer } from '@/types/annotations';
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
  Clock,
  Plus,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// ─── Layer colours ────────────────────────────────────────────────────────────
const LAYER_META: Record<string, { label: string; color: string; bg: string }> =
  {
    PERSONAL: {
      label: 'Personal',
      color: 'text-violet-700',
      bg: 'bg-violet-50 border-violet-200',
    },
    SHARED: {
      label: 'Shared',
      color: 'text-blue-700',
      bg: 'bg-blue-50   border-blue-200',
    },
    INSTRUCTOR: {
      label: 'Instructor',
      color: 'text-green-700',
      bg: 'bg-green-50  border-green-200',
    },
    AI_GENERATED: {
      label: 'AI',
      color: 'text-amber-700',
      bg: 'bg-amber-50  border-amber-200',
    },
  };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function highlightText(text: string, query: string) {
  if (!query.trim() || query.length < 2) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const lower = query.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lower ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

// ─── Main Component ───────────────────────────────────────────────────────────
export function ContentViewer() {
  const { contentId = 'content-1' } = useParams<{ contentId: string }>();

  // ── Video state ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ── Annotations state ──
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
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>([]);

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState('');

  // ── AI Chat state ──
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      role: 'agent',
      content: `שלום! I'm your Chavruta learning partner. I can help you debate, understand, and explore the concepts in this lesson. Ask me anything!`,
    },
  ]);
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  // ── GraphQL ──
  const [contentResult] = useQuery({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: DEV_MODE,
  });

  const [annotationsResult] = useQuery({
    query: ANNOTATIONS_QUERY,
    variables: { assetId: contentId, layers: activeLayers },
    pause: DEV_MODE,
  });

  const [, createAnnotation] = useMutation(CREATE_ANNOTATION_MUTATION);
  const [, startSession] = useMutation(START_AGENT_SESSION_MUTATION);
  const [, sendMessage] = useMutation(SEND_AGENT_MESSAGE_MUTATION);

  // ── Derived data (real or mock) ──
  const baseAnnotations: Annotation[] =
    DEV_MODE || annotationsResult.error
      ? filterAnnotationsByLayers(getThreadedAnnotations(), activeLayers)
      : (annotationsResult.data?.annotations ?? []);

  // Merge optimistically-added local annotations (DEV_MODE only)
  const annotations: Annotation[] = DEV_MODE
    ? [
        ...filterAnnotationsByLayers(localAnnotations, activeLayers),
        ...baseAnnotations,
      ]
    : baseAnnotations;

  const transcript: TranscriptSegment[] = DEV_MODE
    ? mockTranscript
    : (contentResult.data?.contentItem?.transcript?.segments ?? mockTranscript);
  const bookmarks = mockBookmarks;
  const videoUrl = DEV_MODE
    ? mockVideo.url
    : (contentResult.data?.contentItem?.mediaAsset?.url ?? mockVideo.url);
  const videoTitle = DEV_MODE
    ? mockVideo.title
    : (contentResult.data?.contentItem?.title ?? mockVideo.title);

  // Active transcript segment
  const activeSegment = transcript.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );

  // ── Video controls ──
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!videoRef.current) return;
        if (videoRef.current.paused) void videoRef.current.play();
        else videoRef.current.pause();
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
    activeSegmentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
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
  const handleAddAnnotation = async () => {
    if (!newAnnotation.trim()) return;
    if (DEV_MODE) {
      // Optimistic local add
      setLocalAnnotations((prev) => [
        {
          id: `local-${Date.now()}`,
          content: newAnnotation,
          layer: newLayer,
          userId: 'current-user',
          userName: 'You',
          userRole: 'student',
          timestamp: formatTime(currentTime),
          contentId,
          contentTimestamp: currentTime,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } else {
      await createAnnotation({
        input: {
          assetId: contentId,
          content: newAnnotation,
          layer: newLayer,
          timestampStart: currentTime,
        },
      });
    }
    setNewAnnotation('');
    setShowAnnotationForm(false);
  };

  // ── AI Chat ──
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    if (!DEV_MODE) {
      let sid = agentSessionId;
      if (!sid) {
        const res = await startSession({
          input: { templateType: 'CHAVRUTA', contextContentId: contentId },
        });
        sid = res.data?.startAgentSession?.id ?? null;
        setAgentSessionId(sid);
      }
      if (sid) {
        const res = await sendMessage({ sessionId: sid, content: chatInput });
        const reply = res.data?.sendMessage;
        if (reply)
          setChatMessages((prev) => [
            ...prev,
            { id: reply.id, role: 'agent', content: reply.content },
          ]);
      }
    } else {
      // Mock Chavruta response
      setTimeout(() => {
        const responses = [
          `That's an interesting point. Let me challenge you: if free will truly exists, how do you explain the deterministic nature of neural processes?`,
          `A strong argument! But consider the opposite view: Rambam himself in the Mishneh Torah writes that man has absolute free choice. How do you reconcile this?`,
          `Excellent! Can you find a source in the Talmud that supports or contradicts this position?`,
          `Let's explore this deeper. What would the implications be if you are correct? How would that affect the concept of reward and punishment?`,
        ];
        const reply =
          responses[Math.floor(Math.random() * responses.length)] ?? '';
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'agent', content: reply },
        ]);
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 800);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {DEV_MODE && (
        <div className="mb-3 px-3 py-1.5 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md">
          🔧 Dev Mode — mock content. Start the Gateway for real data.
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-9rem)]">
        {/* ── LEFT: Video + Transcript ── */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3 overflow-hidden">
          {/* Video player */}
          <Card className="flex-shrink-0">
            <CardContent className="p-0">
              <div
                className="relative bg-black rounded-t-lg"
                style={{ aspectRatio: '16/9' }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full rounded-t-lg"
                  onTimeUpdate={(e) =>
                    setCurrentTime(e.currentTarget.currentTime)
                  }
                  onLoadedMetadata={(e) =>
                    setDuration(e.currentTarget.duration)
                  }
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
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
              </div>

              {/* Controls */}
              <div className="px-3 py-2 flex items-center gap-3 bg-muted/40 rounded-b-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={togglePlay}
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
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
                  {muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                {/* Seek bar */}
                <div
                  className="flex-1 relative h-2 bg-muted rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seekTo(((e.clientX - rect.left) / rect.width) * duration);
                  }}
                >
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{
                      width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => videoRef.current?.requestFullscreen()}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
                <button
                  onClick={() => {
                    const idx = SPEED_OPTIONS.indexOf(
                      playbackSpeed as (typeof SPEED_OPTIONS)[number]
                    );
                    setPlaybackSpeed(
                      SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length] ?? 1
                    );
                  }}
                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors min-w-[2.5rem] text-center"
                  title="Playback speed (click to cycle)"
                >
                  {playbackSpeed}×
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Transcript
              </span>
              <span className="text-xs text-muted-foreground">
                {videoTitle}
              </span>
            </div>
            <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {transcript.map((seg, idx) => (
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
                  <FileText className="h-4 w-4" /> Annotations
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAnnotationForm(!showAnnotationForm)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {/* Layer toggles */}
              <div className="flex flex-wrap gap-1">
                {(Object.keys(LAYER_META) as AnnotationLayer[]).map((layer) => (
                  <button
                    key={layer}
                    onClick={() => toggleLayer(layer)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-opacity
                      ${LAYER_META[layer]?.bg ?? ''} ${LAYER_META[layer]?.color ?? ''}
                      ${activeLayers.includes(layer) ? 'opacity-100' : 'opacity-30'}`}
                  >
                    {activeLayers.includes(layer) ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    {LAYER_META[layer]?.label}
                  </button>
                ))}
              </div>
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
                  placeholder="Add annotation at current timestamp..."
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
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddAnnotation}
                  >
                    Save @ {formatTime(currentTime)}
                  </Button>
                </div>
              </div>
            )}

            {/* Annotations list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {annotations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No annotations visible. Enable layers above.
                </p>
              )}
              {annotations.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-3 rounded-md border text-sm space-y-1 cursor-pointer hover:shadow-sm transition-shadow
                    ${LAYER_META[ann.layer]?.bg ?? ''}`}
                  onClick={() =>
                    ann.contentTimestamp !== undefined &&
                    seekTo(ann.contentTimestamp)
                  }
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${LAYER_META[ann.layer]?.color ?? ''}`}
                    >
                      {ann.userName ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ann.timestamp ?? formatTime(ann.contentTimestamp ?? 0)}
                    </span>
                  </div>
                  <p className="leading-snug">{ann.content}</p>
                  {/* Replies */}
                  {ann.replies && ann.replies.length > 0 && (
                    <div className="ml-3 pt-2 space-y-2 border-l-2 border-current/20 pl-3">
                      {ann.replies.map((reply: typeof ann) => (
                        <div
                          key={reply.id}
                          className="text-xs text-muted-foreground"
                        >
                          <span className="font-medium">
                            {reply.userName}:{' '}
                          </span>
                          {reply.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Knowledge Graph preview */}
          <Card className="flex-shrink-0">
            <Tabs defaultValue="graph">
              <TabsList className="w-full rounded-none border-b bg-transparent px-2 h-9">
                <TabsTrigger value="graph" className="text-xs flex-1">
                  <Network className="h-3 w-3 mr-1" />
                  Graph
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs flex-1">
                  <Search className="h-3 w-3 mr-1" />
                  Search
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
                  Explore full graph <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </TabsContent>
              <TabsContent value="search" className="m-0 px-4 py-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transcript, annotations..."
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
                    Search transcripts, annotations &amp; concepts
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
                <p className="text-sm font-semibold">Chavruta AI</p>
                <p className="text-xs text-muted-foreground">
                  Dialectical learning partner
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
                  onClick={() => {
                    setChatInput(prompt);
                  }}
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
                  e.key === 'Enter' && !e.shiftKey && handleSendChat()
                }
                placeholder="Ask or debate..."
                className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Button
                size="sm"
                className="h-9 w-9 p-0 flex-shrink-0"
                onClick={handleSendChat}
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
