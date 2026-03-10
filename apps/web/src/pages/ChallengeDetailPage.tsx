import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Leaderboard } from '@/components/challenge/Leaderboard';
import { CountdownTimer } from '@/components/challenge/CountdownTimer';
import {
  CHALLENGE_LEADERBOARD_QUERY,
  SUBMIT_SCORE_MUTATION,
} from '@/lib/graphql/challenges.queries';

interface LeaderboardEntry {
  id: string;
  userId: string;
  score: number;
  rank?: number | null;
  joinedAt: string;
  completedAt?: string | null;
}

export function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [mounted, setMounted] = useState(false);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [leaderboardResult] = useQuery({
    query: CHALLENGE_LEADERBOARD_QUERY,
    variables: { challengeId: id },
    pause: !mounted || !id,
  });

  const [submitResult, submitScore] = useMutation(SUBMIT_SCORE_MUTATION);

  const entries: LeaderboardEntry[] = leaderboardResult.data?.challengeLeaderboard ?? [];

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(scoreInput, 10);
    if (isNaN(parsed) || parsed < 0) {
      setSubmitError('Please enter a valid score');
      return;
    }
    setSubmitError(null);
    const result = await submitScore({ challengeId: id, score: parsed });
    if (!result.error) {
      setShowScoreForm(false);
      setScoreInput('');
    } else {
      setSubmitError('Failed to submit score. Please try again.');
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            to="/challenges"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Challenges
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">Detail</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Challenge Leaderboard</h1>
          {!showScoreForm && (
            <button
              onClick={() => setShowScoreForm(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Submit Score
            </button>
          )}
        </div>

        {showScoreForm && (
          <form
            onSubmit={handleSubmitScore}
            className="mb-6 rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
          >
            <h2 className="text-sm font-semibold text-foreground">Submit Your Score</h2>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label htmlFor="score-input" className="text-xs text-muted-foreground block mb-1">
                  Score
                </label>
                <input
                  id="score-input"
                  type="number"
                  min={0}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder="Enter score..."
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitResult.fetching}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitResult.fetching ? 'Submitting...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => { setShowScoreForm(false); setSubmitError(null); }}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
            {submitError && (
              <p className="text-xs text-destructive">{submitError}</p>
            )}
          </form>
        )}

        {leaderboardResult.fetching && (
          <p className="text-sm text-muted-foreground mb-4">Loading leaderboard...</p>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{entries.length} participant{entries.length !== 1 ? 's' : ''}</p>
          {id && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Ends in:</span>
              <CountdownTimer endDate={new Date(Date.now() + 7 * 86400000).toISOString()} />
            </div>
          )}
        </div>

        <Leaderboard entries={entries} />
      </div>
    </Layout>
  );
}
