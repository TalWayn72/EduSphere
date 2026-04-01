import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { useQuery } from 'urql';
import { MY_GAMIFICATION_STATS_QUERY } from '@/lib/graphql/gamification.queries';

interface Challenge {
  challengeId: string;
  title: string;
  completed: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
}

interface GamificationStats {
  currentStreak: number;
  longestStreak: number;
  activeChallenges: Challenge[];
  leaderboard: LeaderboardEntry[];
}

export function MyProgressPage() {
  const { t } = useTranslation(['gamification', 'common']);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery<{
    myGamificationStats: GamificationStats | null;
  }>({
    query: MY_GAMIFICATION_STATS_QUERY,
    pause: !mounted,
  });

  if (!mounted || fetching) {
    return (
      <Layout>
        <div
          className="p-6"
          aria-busy="true"
          aria-label="Loading progress data"
        >
          {t('common:loading')}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-destructive">{t('common:unableToLoad')}</p>
        </div>
      </Layout>
    );
  }

  const stats = data?.myGamificationStats;

  const activeChallengesCount =
    stats?.activeChallenges?.filter((c) => !c.completed).length ?? 0;

  const myRank = stats?.leaderboard?.[0]?.rank ?? null;

  return (
    <Layout>
      <PageShell size="md" className="p-6">
        <h1 className="text-3xl font-bold">{t('gamification:myProgress')}</h1>

        {!stats ? (
          <p className="text-muted-foreground">
            {t('gamification:startCourseToTrack')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {t('gamification:currentStreak')}
              </p>
              <p className="text-3xl font-bold">
                {stats.currentStreak}{' '}
                <span className="text-sm font-normal">
                  {t('gamification:days')}
                </span>
              </p>
              {stats.longestStreak > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('gamification:longestStreak', {
                    value: stats.longestStreak,
                  })}
                </p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {t('gamification:activeChallenges')}
              </p>
              <p className="text-3xl font-bold">{activeChallengesCount}</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {t('gamification:leaderboardPosition')}
              </p>
              <p className="text-3xl font-bold">
                {myRank != null ? `#${myRank}` : '—'}
              </p>
            </div>
          </div>
        )}
      </PageShell>
    </Layout>
  );
}
