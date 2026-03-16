import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Video, Plus, Radio } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { useLiveSessionActions } from '@/hooks/useLiveSessionActions';
import {
  LIST_LIVE_SESSIONS_QUERY,
  CREATE_LIVE_SESSION_MUTATION,
} from '@/lib/graphql/live-session.queries';
import type { LiveSession, Tab } from './types';
import { SessionCard } from './SessionCard';
import { SkeletonCard } from './SkeletonCard';
import { CreateSessionModal } from './CreateSessionModal';

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
  const [mounted, setMounted] = useState(false);

  // Mount guard — prevents urql graphcache dispatch during sibling render (CLAUDE.md pattern)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // GraphQL — list sessions
  const statusFilter =
    activeTab === 'upcoming' ? undefined : 'ENDED';
  const [sessionsResult] = useQuery({
    query: LIST_LIVE_SESSIONS_QUERY,
    variables: { status: statusFilter, limit: 20, offset: 0 },
    pause: !mounted,
  });

  // Mutations — create (inline) + session actions via hook
  const [createResult, executeCreate] = useMutation(CREATE_LIVE_SESSION_MUTATION);
  const {
    startSession,
    endSession,
    joinSession,
    cancelSession,
    startFetching,
    endFetching,
    joinFetching,
    cancelFetching,
  } = useLiveSessionActions();

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
    await joinSession(sessionId);
    navigate(`/sessions/${sessionId}`);
  };

  const handleStart = async (sessionId: string) => {
    await startSession(sessionId);
    navigate(`/sessions/${sessionId}`);
  };

  const handleEnd = async (sessionId: string) => {
    await endSession(sessionId);
  };

  const handleCancel = async (sessionId: string) => {
    await cancelSession(sessionId);
  };

  const handleOpen = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  return (
    <Layout>
      <PageShell size="md">
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
        <div className="flex gap-1 border-b" role="tablist" aria-label="Session filter tabs">
          {(['upcoming', 'past'] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tab-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
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
            aria-live="polite"
            aria-label="Session list"
          >
            {filteredSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                isInstructor={isInstructor}
                onJoin={handleJoin}
                onStart={handleStart}
                onEnd={handleEnd}
                onCancel={handleCancel}
                onOpen={handleOpen}
                joinFetching={joinFetching}
                startFetching={startFetching}
                endFetching={endFetching}
                cancelFetching={cancelFetching}
              />
            ))}
          </div>
        )}
      </PageShell>

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
