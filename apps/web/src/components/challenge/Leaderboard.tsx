interface LeaderboardEntry {
  id: string;
  userId: string;
  score: number;
  rank?: number | null;
  completedAt?: string | null;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function formatCompletedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No entries yet — be the first to submit a score!
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground w-16">Rank</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Learner</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Score</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">Completed</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const displayRank = entry.rank ?? idx + 1;
            const medal = displayRank <= 3 ? RANK_MEDALS[displayRank - 1] : null;
            return (
              <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2 text-center font-semibold text-foreground">
                  {medal ? (
                    <span aria-label={`Rank ${displayRank}`}>{medal}</span>
                  ) : (
                    <span className="text-muted-foreground">#{displayRank}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-foreground">
                  Learner {entry.userId.slice(0, 6)}
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-foreground">
                  {entry.score}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground hidden sm:table-cell">
                  {formatCompletedAt(entry.completedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
