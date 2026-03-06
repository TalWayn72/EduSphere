import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Video,
  Users,
  MessageSquare,
  Send,
  Radio,
  StopCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import {
  GET_LIVE_SESSION_QUERY,
  JOIN_LIVE_SESSION_MUTATION,
  END_LIVE_SESSION_MUTATION,
} from '@/lib/graphql/live-session.queries';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LiveSession {
  id: string;
  contentItemId: string;
  meetingName: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  recordingUrl: string | null;
  participantCount?: number | null;
  maxParticipants?: number | null;
  instructorId?: string | null;
  courseId?: string | null;
}

interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  sentAt: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LiveSession['status'] }) {
  if (status === 'LIVE') {
    return (
      <span
        data-testid="detail-status-live"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700"
      >
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
        Live Now
      </span>
    );
  }
  if (status === 'SCHEDULED') {
    return (
      <span
        data-testid="detail-status-scheduled"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700"
      >
        <Radio className="h-3 w-3" aria-hidden />
        Scheduled
      </span>
    );
  }
  return (
    <span
      data-testid="detail-status-ended"
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-muted text-muted-foreground"
    >
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      Ended
    </span>
  );
}

// ─── Chat Sidebar ─────────────────────────────────────────────────────────────
function ChatSidebar({
  isLive,
  messages,
  onSend,
  participantCount,
}: {
  isLive: boolean;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  participantCount: number;
}) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <aside className="flex flex-col h-full border-l" data-testid="chat-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="font-semibold text-sm flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" aria-hidden />
          Live Chat
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" aria-hidden />
          {participantCount}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" data-testid="chat-messages">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            No messages yet. Be the first to say hello!
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {m.displayName[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-xs font-medium">{m.displayName}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(m.sentAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-sm ml-7 leading-snug">{m.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t flex gap-2 shrink-0">
        <input
          className="flex-1 text-sm px-3 py-1.5 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          placeholder={isLive ? 'Type a message...' : 'Session ended'}
          value={input}
          disabled={!isLive}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          data-testid="chat-input"
        />
        <Button
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleSend}
          disabled={!isLive || !input.trim()}
          aria-label="Send message"
          data-testid="chat-send-btn"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function LiveSessionDetailPage() {
  const { t } = useTranslation('collaboration');
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isInstructor =
    user?.role === 'INSTRUCTOR' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ORG_ADMIN';

  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Fetch session detail
  const [sessionResult] = useQuery({
    query: GET_LIVE_SESSION_QUERY,
    variables: { sessionId: sessionId ?? '' },
    pause: !sessionId,
  });

  const [joinResult, executeJoin] = useMutation(JOIN_LIVE_SESSION_MUTATION);
  const [endResult, executeEnd] = useMutation(END_LIVE_SESSION_MUTATION);

  const session: LiveSession | null =
    (sessionResult.data?.liveSessionById as LiveSession | undefined) ?? null;

  const isLive = session?.status === 'LIVE';
  const isEnded = session?.status === 'ENDED';

  const handleJoin = async () => {
    if (!sessionId) return;
    await executeJoin({ sessionId });
    setJoined(true);
  };

  const handleEnd = async () => {
    if (!sessionId) return;
    await executeEnd({ sessionId });
  };

  const handleChatSend = (text: string) => {
    if (!user) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      userId: user.username ?? 'me',
      displayName: user.firstName ?? user.username ?? 'Me',
      text,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev]);
    setMessages((prev) => [...prev, msg]);
  };

  // Loading state
  if (sessionResult.fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64" data-testid="session-detail-loading">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (sessionResult.error || !session) {
    return (
      <Layout>
        <div className="text-center py-20" data-testid="session-detail-error">
          <p className="text-destructive font-medium">
            Session not found or failed to load.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/sessions')}
          >
            Back to Sessions
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/sessions')}
            data-testid="back-btn"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Sessions
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold" data-testid="session-detail-title">
              {session.meetingName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {session.participantCount ?? 0} participants
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={session.status} />
            {!isEnded && !joined && !isInstructor && (
              <Button
                size="sm"
                onClick={handleJoin}
                disabled={joinResult.fetching}
                data-testid="join-btn"
              >
                {joinResult.fetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('joinSession')
                )}
              </Button>
            )}
            {!isEnded && joined && !isInstructor && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setJoined(false)}
                data-testid="leave-btn"
              >
                Leave
              </Button>
            )}
            {isInstructor && isLive && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEnd}
                disabled={endResult.fetching}
                data-testid="end-session-btn"
              >
                {endResult.fetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <StopCircle className="h-4 w-4 mr-1" />
                    {t('endSession')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Two-column layout */}
        <div
          className="grid gap-4 lg:grid-cols-[1fr_320px]"
          style={{ height: 'calc(100vh - 18rem)' }}
        >
          {/* Main Area */}
          <Card className="flex flex-col overflow-hidden">
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Video placeholder */}
              <div
                className="flex-1 bg-zinc-900 flex flex-col items-center justify-center gap-3 rounded-t-lg"
                data-testid="video-area"
              >
                {isEnded ? (
                  <div className="text-center space-y-2" data-testid="session-ended-state">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-white font-semibold">Session Ended</p>
                    {session.recordingUrl && (
                      <a
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm underline"
                        data-testid="recording-link"
                      >
                        Watch Recording
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <Video className="h-16 w-16 text-zinc-600" aria-hidden />
                    <p className="text-zinc-400 text-sm">
                      {isLive ? 'Live video stream' : 'Session not started yet'}
                    </p>
                    {isLive && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Instructor controls bar */}
              {isInstructor && !isEnded && (
                <div
                  className="border-t px-4 py-2 flex items-center gap-3 bg-muted/30"
                  data-testid="instructor-controls"
                >
                  <p className="text-xs text-muted-foreground flex-1">
                    Instructor controls
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Start Recording
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Sidebar */}
          <Card className="flex flex-col overflow-hidden">
            <ChatSidebar
              isLive={isLive}
              messages={messages}
              onSend={handleChatSend}
              participantCount={session.participantCount ?? 0}
            />
          </Card>
        </div>
      </div>
    </Layout>
  );
}
