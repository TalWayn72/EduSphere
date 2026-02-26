import { useQuery } from 'urql';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  LEADERBOARD_QUERY,
  MY_RANK_QUERY,
} from '@/lib/graphql/gamification.queries';
import { getCurrentUser } from '@/lib/auth';

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

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function LeaderboardWidget() {
  const localUser = getCurrentUser();

  const [leaderboardResult] = useQuery<LeaderboardResult>({
    query: LEADERBOARD_QUERY,
    variables: { limit: 5 },
  });

  const [rankResult] = useQuery<MyRankResult>({
    query: MY_RANK_QUERY,
  });

  const entries = leaderboardResult.data?.leaderboard ?? [];
  const myRank = rankResult.data?.myRank;
  const loading = leaderboardResult.fetching;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🏆 Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded animate-pulse bg-muted" />
          ))
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No data yet
          </p>
        ) : (
          entries.map((entry) => {
            const isMe =
              localUser && entry.displayName.includes(localUser.firstName);
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 px-2 py-1.5 rounded text-sm ${isMe ? 'bg-primary/10 font-medium' : ''}`}
              >
                <span className="w-6 text-center shrink-0">
                  {MEDAL[entry.rank] ?? (
                    <span className="text-muted-foreground">#{entry.rank}</span>
                  )}
                </span>
                <span className="flex-1 truncate">{entry.displayName}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {entry.badgeCount} badges
                </span>
                <span className="font-semibold text-primary shrink-0">
                  {entry.totalPoints.toLocaleString()} pts
                </span>
              </div>
            );
          })
        )}
        {myRank !== undefined && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            Your rank: #{myRank}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
