import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Bot,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Plus,
} from 'lucide-react';
import {
  MY_DISCUSSIONS_QUERY,
  CREATE_DISCUSSION_MUTATION,
} from '@/lib/graphql/collaboration.queries';

interface BackendDiscussion {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  creatorId: string;
  discussionType: 'FORUM' | 'CHAVRUTA' | 'DEBATE';
  participantCount: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

type MatchState = 'idle' | 'searching' | 'found';

function toSessionUrl(title: string, id: string): string {
  const params = new URLSearchParams({ partner: title, discussionId: id });
  return `/collaboration/session?${params.toString()}`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CollaborationPage() {
  const { t } = useTranslation('collaboration');
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [matchMode, setMatchMode] = useState<'human' | 'ai'>('human');
  const matchTimeoutRef1 = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const matchTimeoutRef2 = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Cleanup match timeouts on unmount
  useEffect(() => {
    return () => {
      if (matchTimeoutRef1.current) clearTimeout(matchTimeoutRef1.current);
      if (matchTimeoutRef2.current) clearTimeout(matchTimeoutRef2.current);
    };
  }, []);

  // MY_DISCUSSIONS_QUERY is not in the running gateway supergraph (Docker image predates
  // the feature). Pause until the image is rebuilt. Tracked in OPEN_ISSUES.md (BUG-DOCKER-001).
  const [{ data, fetching, error }, reexecute] = useQuery({
    query: MY_DISCUSSIONS_QUERY,
    variables: { limit: 20, offset: 0 },
    pause: true,
  });

  const [createResult, executeCreate] = useMutation(CREATE_DISCUSSION_MUTATION);

  // "Cannot query field" means the running subgraph build predates myDiscussions
  // being added to the schema. Treat as empty list until Docker image is rebuilt.
  const isSchemaValidationError =
    error?.message?.includes('Cannot query field');
  const discussions: BackendDiscussion[] =
    (data as { myDiscussions?: BackendDiscussion[] } | undefined)
      ?.myDiscussions ?? [];

  const activeSessions = discussions.filter(
    (d) => d.discussionType === 'CHAVRUTA'
  );
  const recentSessions = discussions.filter(
    (d) => d.discussionType !== 'CHAVRUTA'
  );

  const handleStartMatching = (mode: 'human' | 'ai') => {
    setMatchMode(mode);
    setMatchState('searching');
    if (mode === 'ai') {
      matchTimeoutRef1.current = setTimeout(() => {
        setMatchState('found');
        matchTimeoutRef2.current = setTimeout(
          () =>
            navigate(
              `/collaboration/session?partner=AI+Chavruta&topic=Dialectical+study`
            ),
          1200
        );
      }, 1000);
    } else {
      matchTimeoutRef1.current = setTimeout(() => setMatchState('found'), 3000);
    }
  };

  const handleCreateChavruta = async () => {
    const result = await executeCreate({
      input: {
        courseId: '00000000-0000-0000-0000-000000000001',
        title: `Chavruta session ${new Date().toLocaleTimeString()}`,
        discussionType: 'CHAVRUTA',
      },
    });
    if (!result.error && result.data) {
      const disc = (result.data as { createDiscussion: BackendDiscussion })
        .createDiscussion;
      reexecute({ requestPolicy: 'network-only' });
      navigate(toSessionUrl(disc.title, disc.id));
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Match panel */}
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Human Chavruta */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">{t('humanChavruta')}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('humanChavrutaDescription')}
                </p>
                {matchState === 'idle' || matchMode !== 'human' ? (
                  <Button
                    className="w-full"
                    onClick={() => handleStartMatching('human')}
                  >
                    {t('findPartner')}
                  </Button>
                ) : matchState === 'searching' ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('searchingPartner')}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleCreateChavruta}
                    disabled={createResult.fetching}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {createResult.fetching
                      ? t('creatingSession')
                      : t('partnerFound')}
                  </Button>
                )}
              </div>

              {/* AI Chavruta */}
              <div className="space-y-3 border-l pl-6">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">{t('aiChavruta')}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('aiChavrutaDescription')}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>{t('alwaysAvailable')}</span>
                </div>
                {matchState === 'idle' || matchMode !== 'ai' ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleStartMatching('ai')}
                  >
                    {t('startAiChavruta')}
                  </Button>
                ) : matchState === 'searching' ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('connectingAi')}
                  </Button>
                ) : (
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('openingSession')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error state — hide schema-validation errors (field not yet in deployed subgraph) */}
        {error && !isSchemaValidationError && (
          <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t('loadError')}: {error.message}
          </div>
        )}

        {/* Active Chavruta sessions */}
        {fetching ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loadingSessions')}
          </div>
        ) : (
          <>
            {activeSessions.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t('activeSessions')}
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {activeSessions.map((session) => (
                    <Card
                      key={session.id}
                      className="border-green-200 bg-green-50/50"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-sm font-semibold truncate max-w-[160px]">
                                {session.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {session.participantCount} participants
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(session.createdAt)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              navigate(toSessionUrl(session.title, session.id))
                            }
                          >
                            {t('rejoin')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recent discussions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t('recentDiscussions')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleCreateChavruta}
                  disabled={createResult.fetching}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('newSession')}
                </Button>
              </div>

              {recentSessions.length === 0 && !fetching && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">{t('noSessions')}</p>
                  <p className="text-xs mt-1">{t('noSessionsHint')}</p>
                </div>
              )}

              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <Card
                    key={session.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(toSessionUrl(session.title, session.id))
                    }
                  >
                    <CardContent className="p-3 flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.discussionType} · {session.messageCount}{' '}
                          messages
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(session.updatedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.participantCount} participants
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
