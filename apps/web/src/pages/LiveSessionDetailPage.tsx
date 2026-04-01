import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Video,
  CheckCircle2,
  Loader2,
  StopCircle,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import {
  GET_LIVE_SESSION_QUERY,
  JOIN_LIVE_SESSION_MUTATION,
  END_LIVE_SESSION_MUTATION,
} from '@/lib/graphql/live-session.queries';
import type { LiveSession, ChatMessage } from './LiveSessionDetailPage.types';
import { StatusBadge } from './LiveSessionStatusBadge';
import { ChatSidebar } from './LiveSessionChatSidebar';

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [sessionResult] = useQuery({
    query: GET_LIVE_SESSION_QUERY,
    variables: { sessionId: sessionId ?? '' },
    pause: !mounted || !sessionId,
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

  if (sessionResult.fetching) {
    return (
      <Layout>
        <div
          className="flex items-center justify-center h-64"
          data-testid="session-detail-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

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
      <PageShell size="xl" spacing="compact">
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

        <SessionHeader
          session={session}
          isEnded={isEnded}
          isInstructor={isInstructor}
          joined={joined}
          joinFetching={joinResult.fetching}
          endFetching={endResult.fetching}
          isLive={isLive}
          onJoin={handleJoin}
          onLeave={() => setJoined(false)}
          onEnd={handleEnd}
          t={t}
        />

        <div
          className="grid gap-4 lg:grid-cols-[1fr_320px]"
          style={{ height: 'calc(100vh - 18rem)' }}
        >
          <Card className="flex flex-col overflow-hidden">
            <CardContent className="flex-1 flex flex-col p-0">
              <VideoArea session={session} isLive={isLive} isEnded={isEnded} />
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
          <Card className="flex flex-col overflow-hidden">
            <ChatSidebar
              isLive={isLive}
              messages={messages}
              onSend={handleChatSend}
              participantCount={session.participantCount ?? 0}
            />
          </Card>
        </div>
      </PageShell>
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SessionHeader({
  session,
  isEnded,
  isInstructor,
  joined,
  joinFetching,
  endFetching,
  isLive,
  onJoin,
  onLeave,
  onEnd,
  t,
}: {
  session: LiveSession;
  isEnded: boolean;
  isInstructor: boolean;
  joined: boolean;
  joinFetching: boolean;
  endFetching: boolean;
  isLive: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onEnd: () => void;
  t: (key: string) => string;
}) {
  return (
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
            onClick={onJoin}
            disabled={joinFetching}
            data-testid="join-btn"
          >
            {joinFetching ? (
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
            onClick={onLeave}
            data-testid="leave-btn"
          >
            Leave
          </Button>
        )}
        {isInstructor && isLive && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onEnd}
            disabled={endFetching}
            data-testid="end-session-btn"
          >
            {endFetching ? (
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
  );
}

function VideoArea({
  session,
  isLive,
  isEnded,
}: {
  session: LiveSession;
  isLive: boolean;
  isEnded: boolean;
}) {
  return (
    <div
      className="flex-1 bg-zinc-900 flex flex-col items-center justify-center gap-3 rounded-t-lg dark:bg-zinc-100"
      data-testid="video-area"
    >
      {isEnded ? (
        <div
          className="text-center space-y-2"
          data-testid="session-ended-state"
        >
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-white font-semibold dark:text-white">
            Session Ended
          </p>
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
          <Video
            className="h-16 w-16 text-zinc-600 dark:text-zinc-300"
            aria-hidden
          />
          <p className="text-zinc-400 text-sm dark:text-zinc-500">
            {isLive ? 'Live video stream' : 'Session not started yet'}
          </p>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 dark:bg-red-400/20 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse dark:bg-red-500" />
              LIVE
            </span>
          )}
        </>
      )}
    </div>
  );
}
