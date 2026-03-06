import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  Radio,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import {
  LIST_LIVE_SESSIONS_QUERY,
  CREATE_LIVE_SESSION_MUTATION,
  JOIN_LIVE_SESSION_MUTATION,
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

type Tab = 'upcoming' | 'past';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Started';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Starts in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Starts in ${hours}h`;
  return `Starts in ${Math.floor(hours / 24)}d`;
}

function StatusBadge({ status }: { status: LiveSession['status'] }) {
  if (status === 'LIVE') {
    return (
      <span
        data-testid="session-status-live"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        Live Now
      </span>
    );
  }
  if (status === 'SCHEDULED') {
    return (
      <span
        data-testid="session-status-scheduled"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"
      >
        <Clock className="h-3 w-3" />
        Scheduled
      </span>
    );
  }
  return (
    <span
      data-testid="session-status-ended"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground"
    >
      <CheckCircle2 className="h-3 w-3" />
      Ended
    </span>
  );
}

function SessionCard({
  session,
  isInstructor,
  onJoin,
  onOpen,
}: {
  session: LiveSession;
  isInstructor: boolean;
  onJoin: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const isLive = session.status === 'LIVE';
  const isScheduled = session.status === 'SCHEDULED';
  const canAct = isLive || isScheduled;

  return (
    <Card
      data-testid="session-card"
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onOpen(session.id)}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" data-testid="session-title">
              {session.meetingName}
            </p>
            {session.scheduledAt && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {isLive
                  ? 'Live Now!'
                  : formatRelativeTime(session.scheduledAt)}
              </p>
            )}
          </div>
          <StatusBadge status={session.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {session.participantCount ?? 0}
            {session.maxParticipants ? ` / ${session.maxParticipants}` : ''}{' '}
            participants
          </span>
          {session.courseId && (
            <span className="truncate">Course: {session.courseId}</span>
          )}
        </div>

        {canAct && (
          <Button
            size="sm"
            variant={isLive ? 'default' : 'outline'}
            className="w-full mt-1"
            data-testid="session-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (isInstructor) {
                onOpen(session.id);
              } else {
                onJoin(session.id);
              }
            }}
          >
            {isInstructor
              ? isLive
                ? 'Manage'
                : 'Start Session'
              : 'Join'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 animate-pulse" data-testid="session-skeleton">
      <div className="flex justify-between">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-16" />
      </div>
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-8 bg-muted rounded" />
    </div>
  );
}

// ─── Create Session Modal ──────────────────────────────────────────────────────
interface CreateModalProps {
  onClose: () => void;
  onCreate: (name: string, contentId: string, scheduledAt: string) => void;
  loading: boolean;
}

function CreateSessionModal({ onClose, onCreate, loading }: CreateModalProps) {
  const [name, setName] = useState('');
  const [contentId] = useState('content-1');
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !scheduledAt) return;
    onCreate(name.trim(), contentId, scheduledAt);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="create-session-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Create Live Session"
    >
      <div className="bg-background rounded-xl border shadow-lg w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold mb-4">Create Live Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1" htmlFor="session-name">
              Session Title
            </label>
            <input
              id="session-name"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly Study Session"
              required
              data-testid="session-name-input"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" htmlFor="session-time">
              Scheduled Time
            </label>
            <input
              id="session-time"
              type="datetime-local"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              data-testid="session-time-input"
            />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim() || !scheduledAt}
              data-testid="create-session-submit"
            >
              {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Create Session
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function LiveSessionsPage() {
  const { t } = useTranslation('collaboration');
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isInstructor =
    user?.role === 'INSTRUCTOR' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ORG_ADMIN';

  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // GraphQL — list sessions
  const statusFilter =
    activeTab === 'upcoming' ? undefined : 'ENDED';
  const [sessionsResult] = useQuery({
    query: LIST_LIVE_SESSIONS_QUERY,
    variables: { status: statusFilter, limit: 20, offset: 0 },
  });

  // Mutations
  const [createResult, executeCreate] = useMutation(CREATE_LIVE_SESSION_MUTATION);
  const [, executeJoin] = useMutation(JOIN_LIVE_SESSION_MUTATION);

  const sessions: LiveSession[] =
    (sessionsResult.data?.liveSessions as LiveSession[] | undefined) ?? [];

  const filteredSessions =
    activeTab === 'upcoming'
      ? sessions.filter((s) => s.status !== 'ENDED')
      : sessions.filter((s) => s.status === 'ENDED');

  const handleCreate = async (name: string, contentId: string, scheduledAt: string) => {
    const isoAt = new Date(scheduledAt).toISOString();
    await executeCreate({
      contentItemId: contentId,
      meetingName: name,
      scheduledAt: isoAt,
    });
    setShowCreateModal(false);
  };

  const handleJoin = async (sessionId: string) => {
    await executeJoin({ sessionId });
    navigate(`/sessions/${sessionId}`);
  };

  const handleOpen = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" aria-hidden />
              {t('sessions')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Join or host live learning sessions
            </p>
          </div>
          {isInstructor && (
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="flex items-center gap-1.5"
              data-testid="create-session-btn"
            >
              <Plus className="h-4 w-4" />
              Create Session
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b" role="tablist">
          {(['upcoming', 'past'] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              data-testid={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>

        {/* Content */}
        {sessionsResult.fetching ? (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="sessions-loading"
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : sessionsResult.error ? (
          <div
            className="text-center py-16 text-destructive"
            data-testid="sessions-error"
          >
            <p className="font-medium">Failed to load sessions</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please try again or contact support if the problem persists.
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div
            className="text-center py-20 space-y-3"
            data-testid="sessions-empty"
          >
            <Radio className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">
              No sessions scheduled
            </p>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'upcoming'
                ? 'No upcoming sessions. Check back later or create one.'
                : 'No past sessions yet.'}
            </p>
            {isInstructor && activeTab === 'upcoming' && (
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                data-testid="empty-create-btn"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Session
              </Button>
            )}
          </div>
        ) : (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="sessions-grid"
          >
            {filteredSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                isInstructor={isInstructor}
                onJoin={handleJoin}
                onOpen={handleOpen}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          loading={createResult.fetching}
        />
      )}
    </Layout>
  );
}
