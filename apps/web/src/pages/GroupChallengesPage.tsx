import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ChallengeCard } from '@/components/challenge/ChallengeCard';
import {
  ACTIVE_CHALLENGES_QUERY,
  MY_PARTICIPATIONS_QUERY,
  JOIN_CHALLENGE_MUTATION,
} from '@/lib/graphql/challenges.queries';

interface ChallengeNode {
  id: string;
  title: string;
  description?: string | null;
  challengeType: string;
  targetScore: number;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  status: string;
  participantCount: number;
  createdBy: string;
}

interface Participation {
  id: string;
  challengeId: string;
  userId: string;
  score: number;
  rank?: number | null;
  joinedAt: string;
  completedAt?: string | null;
}

type Tab = 'active' | 'mine';

export function GroupChallengesPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeChallengesResult] = useQuery({
    query: ACTIVE_CHALLENGES_QUERY,
    pause: !mounted,
  });

  const [myParticipationsResult] = useQuery({
    query: MY_PARTICIPATIONS_QUERY,
    pause: !mounted,
  });

  const [joinResult, joinChallenge] = useMutation(JOIN_CHALLENGE_MUTATION);

  const challenges: ChallengeNode[] =
    activeChallengesResult.data?.activeChallenges?.edges?.map(
      (e: { node: ChallengeNode }) => e.node
    ) ?? [];

  const participations: Participation[] =
    myParticipationsResult.data?.myChallengePariticipations ?? [];

  const handleJoin = async (challengeId: string) => {
    setJoiningId(challengeId);
    await joinChallenge({ challengeId });
    setJoiningId(null);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Group Challenges</h1>
          <Link
            to="/challenges/new"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create Challenge
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Active Challenges
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'mine'}
            onClick={() => setActiveTab('mine')}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'mine'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            My Participations
          </button>
        </div>

        {/* Active Challenges tab */}
        {activeTab === 'active' && (
          <div>
            {activeChallengesResult.fetching && (
              <p className="text-sm text-muted-foreground">Loading challenges...</p>
            )}
            {!activeChallengesResult.fetching && challenges.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No active challenges yet</p>
              </div>
            )}
            {challenges.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {challenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onJoin={handleJoin}
                    isJoining={joiningId === challenge.id || joinResult.fetching}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Participations tab */}
        {activeTab === 'mine' && (
          <div>
            {myParticipationsResult.fetching && (
              <p className="text-sm text-muted-foreground">Loading your participations...</p>
            )}
            {!myParticipationsResult.fetching && participations.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">You have not joined any challenges yet</p>
              </div>
            )}
            {participations.length > 0 && (
              <div className="flex flex-col gap-3">
                {participations.map((p) => (
                  <Link
                    key={p.id}
                    to={`/challenges/${p.challengeId}`}
                    className="rounded-lg border border-border bg-card p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">Challenge {p.challengeId.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {p.score} {p.rank != null ? `· Rank #${p.rank}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.joinedAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
