import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
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
        <div className="p-6" aria-busy="true" aria-label="Loading progress data">
          Loading...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-destructive">Unable to load progress data. Please try again.</p>
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
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">My Progress</h1>

        {!stats ? (
          <p className="text-muted-foreground">
            Start a course to track your progress!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-3xl font-bold">
                {stats.currentStreak}{' '}
                <span className="text-sm font-normal">days</span>
              </p>
              {stats.longestStreak > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Longest streak: {stats.longestStreak} days
                </p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Active Challenges</p>
              <p className="text-3xl font-bold">{activeChallengesCount}</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Leaderboard Position</p>
              <p className="text-3xl font-bold">
                {myRank != null ? `#${myRank}` : '—'}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
