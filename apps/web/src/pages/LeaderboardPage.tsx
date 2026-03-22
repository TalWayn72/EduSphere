import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { Trophy } from 'lucide-react';
import { Layout } from '@/components/Layout';
import {
  LEADERBOARD_QUERY,
  MY_RANK_QUERY,
} from '@/lib/graphql/gamification.queries';
import { getCurrentUser } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalPoints: number;
  badgeCount: number;
}

interface LeaderboardResult {
  leaderboard: LeaderboardEntry[];
}

interface MyRankResult {
  myRank: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

type Period = 'all' | 'month' | 'week';

const PERIOD_KEYS: Record<Period, string> = {
  all: 'allTime',
  month: 'thisMonth',
  week: 'thisWeek',
};

// ─── LeaderboardPage ──────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { t } = useTranslation('gamification');
  const localUser = getCurrentUser();
  const [period, setPeriod] = useState<Period>('all');

  const [{ data, fetching }] = useQuery<LeaderboardResult>({
    query: LEADERBOARD_QUERY,
    variables: { limit: 50 },
  });

  const [{ data: rankData }] = useQuery<MyRankResult>({
    query: MY_RANK_QUERY,
  });

  const entries = data?.leaderboard ?? [];
  const myRank = rankData?.myRank;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-yellow-500 dark:text-yellow-400" />
            <h1 className="text-2xl font-bold">{t('leaderboard')}</h1>
          </div>
          {myRank !== undefined && (
            <span className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full">
              {t('yourRank')}: #{myRank}
            </span>
          )}
        </div>

        {/* Period tabs (UI-only — backend returns all-time data) */}
        <div
          className="flex rounded-lg border overflow-hidden mb-6 w-fit"
          role="tablist"
          aria-label="Time period"
        >
          {(['all', 'month', 'week'] as Period[]).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={period === key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                period === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              } ${key !== 'all' ? 'border-l' : ''}`}
            >
              {t(PERIOD_KEYS[key])}
            </button>
          ))}
        </div>

        {/* Leaderboard list */}
        <div className="space-y-1">
          {fetching ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse bg-muted" />
            ))
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              {t('emptyLeaderboard')}
            </div>
          ) : (
            entries.map((entry) => {
              const isMe =
                localUser && entry.displayName.includes(localUser.firstName);
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${
                    isMe
                      ? 'bg-primary/10 border border-primary/20 font-semibold'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="w-8 text-center shrink-0 text-lg">
                    {MEDAL[entry.rank] ?? (
                      <span className="text-sm text-muted-foreground font-normal">
                        #{entry.rank}
                      </span>
                    )}
                  </span>
                  <span className="flex-1 truncate">{entry.displayName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {t('badgeCount', { count: entry.badgeCount })}
                  </span>
                  <span className="font-bold text-primary shrink-0 tabular-nums">
                    {entry.totalPoints.toLocaleString()} {t('pts')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
