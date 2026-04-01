/**
 * CollaborationPage — Chavruta study matching and discussion management.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { DEV_MODE } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  MY_DISCUSSIONS_QUERY,
  CREATE_DISCUSSION_MUTATION,
} from '@/lib/graphql/collaboration.queries';
import type { BackendDiscussion, MatchState } from './collaboration.types';
import { toSessionUrl } from './collaboration.types';
import { MatchPanel } from './MatchPanel';
import { SessionList } from './SessionList';

export function CollaborationPage() {
  const { t } = useTranslation(['collaboration', 'common']);
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [matchMode, setMatchMode] = useState<'human' | 'ai'>('human');
  const matchTimeoutRef1 = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const matchTimeoutRef2 = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (matchTimeoutRef1.current) clearTimeout(matchTimeoutRef1.current);
      if (matchTimeoutRef2.current) clearTimeout(matchTimeoutRef2.current);
    };
  }, []);

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: MY_DISCUSSIONS_QUERY,
    variables: { limit: 20, offset: 0 },
    pause: !mounted || DEV_MODE,
  });

  const [createResult, executeCreate] = useMutation(CREATE_DISCUSSION_MUTATION);

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

        <MatchPanel
          matchState={matchState}
          matchMode={matchMode}
          isCreating={createResult.fetching}
          onStartMatching={handleStartMatching}
          onCreateChavruta={() => void handleCreateChavruta()}
        />

        {error && !isSchemaValidationError && (
          <div
            role="alert"
            aria-live="polite"
            data-testid="collab-offline-banner"
            className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-md dark:text-orange-200 dark:bg-orange-950 dark:border-orange-700"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>{t('loadError')}</span>
            </div>
            <button
              onClick={() => reexecute({ requestPolicy: 'network-only' })}
              className="underline hover:no-underline text-orange-900 font-medium shrink-0 dark:text-orange-100"
              data-testid="collab-offline-banner-retry"
            >
              {t('common:retry')}
            </button>
          </div>
        )}

        {error && isSchemaValidationError && (
          <div
            role="status"
            aria-live="polite"
            data-testid="collab-schema-banner"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md dark:text-blue-200 dark:bg-blue-950 dark:border-blue-700"
          >
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span>{t('schemaUpgradeNotice')}</span>
          </div>
        )}

        {fetching ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loadingSessions')}
          </div>
        ) : (
          <SessionList
            activeSessions={activeSessions}
            recentSessions={recentSessions}
            fetching={fetching}
            isCreating={createResult.fetching}
            onCreateChavruta={() => void handleCreateChavruta()}
          />
        )}
      </div>
    </Layout>
  );
}
