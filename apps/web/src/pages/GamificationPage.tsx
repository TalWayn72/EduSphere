/**
 * GamificationPage — Streaks, Challenges, and XP Leaderboard for learners.
 * Route: /gamification
 */
import { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Flame, Target } from 'lucide-react';
import { MY_GAMIFICATION_STATS_QUERY } from '@/lib/graphql/gamification.queries';

interface ActiveChallenge {
  challengeId: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  xpReward: number;
  completed: boolean;
  endDate: string;
}

interface XpLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
}

interface GamificationStatsData {
  myGamificationStats: {
    currentStreak: number;
    longestStreak: number;
    activeChallenges: ActiveChallenge[];
    leaderboard: XpLeaderboardEntry[];
  };
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

export function GamificationPage() {
  const { t } = useTranslation('gamification');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<GamificationStatsData>({
    query: MY_GAMIFICATION_STATS_QUERY,
    pause: !mounted,
  });

  const stats = data?.myGamificationStats;

  if (!mounted || fetching) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Trophy
            className="h-8 w-8 text-yellow-500 dark:text-yellow-400"
            aria-hidden="true"
          />
          <h1 className="text-3xl font-bold">{t('gamification')}</h1>
        </div>

        <Tabs defaultValue="progress">
          <TabsList>
            <TabsTrigger value="progress">{t('progress')}</TabsTrigger>
            <TabsTrigger value="challenges">{t('challenges')}</TabsTrigger>
            <TabsTrigger value="leaderboard">{t('leaderboard')}</TabsTrigger>
          </TabsList>

          {/* ── Progress tab ────────────────────────────────────────── */}
          <TabsContent value="progress" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <Flame
                    className="h-5 w-5 text-orange-500 dark:text-orange-400"
                    aria-hidden="true"
                  />
                  <CardTitle className="text-base">
                    {t('currentStreak')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-orange-500 dark:text-orange-400">
                    {stats?.currentStreak ?? 0}
                    <span className="text-lg text-muted-foreground ml-1">
                      {t('days')}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('longestStreak', { value: stats?.longestStreak ?? 0 })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {t('activeChallenges')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats?.activeChallenges.filter((c) => !c.completed)
                      .length ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('completed')}{' '}
                    {stats?.activeChallenges.filter((c) => c.completed)
                      .length ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Challenges tab ──────────────────────────────────────── */}
          <TabsContent value="challenges" className="mt-4">
            {!stats?.activeChallenges || stats.activeChallenges.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t('noActiveChallenges')}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.activeChallenges.map((c) => (
                  <Card
                    key={c.challengeId}
                    className={c.completed ? 'opacity-60' : ''}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Target
                          className="h-4 w-4 text-indigo-500 dark:text-indigo-400"
                          aria-hidden="true"
                        />
                        <Badge variant={c.completed ? 'default' : 'secondary'}>
                          +{c.xpReward} XP
                        </Badge>
                      </div>
                      <CardTitle className="text-sm mt-2">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">
                        {c.description}
                      </p>
                      <Progress
                        value={Math.min(
                          100,
                          (c.currentValue / c.targetValue) * 100
                        )}
                        className="h-2"
                        aria-label={`${c.title} progress`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.currentValue} / {c.targetValue}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('ends', { date: c.endDate })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Leaderboard tab ─────────────────────────────────────── */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <table className="w-full" aria-label="XP Leaderboard">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-4 w-12" scope="col">
                        #
                      </th>
                      <th className="p-4" scope="col">
                        {t('name')}
                      </th>
                      <th className="p-4" scope="col">
                        {t('level')}
                      </th>
                      <th className="p-4 text-right" scope="col">
                        {t('xp')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.leaderboard ?? []).map((entry) => (
                      <tr
                        key={entry.userId}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="p-4 text-sm font-mono">
                          {entry.rank <= 3
                            ? RANK_MEDALS[entry.rank - 1]
                            : entry.rank}
                        </td>
                        <td className="p-4 text-sm font-medium">
                          {entry.displayName}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">
                            {t('level')} {entry.level}
                          </Badge>
                        </td>
                        <td className="p-4 text-right text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                          {entry.totalXp.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(stats?.leaderboard ?? []).length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-muted-foreground"
                        >
                          {t('noLeaderboardData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
