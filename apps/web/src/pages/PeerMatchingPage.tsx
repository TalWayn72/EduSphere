import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/peer-matching/MatchCard';
import {
  PEER_MATCHES_QUERY,
  MY_MATCH_REQUESTS_QUERY,
  REQUEST_PEER_MATCH_MUTATION,
  RESPOND_PEER_MATCH_MUTATION,
} from '@/lib/graphql/peer-matching.queries';

interface PeerMatch {
  userId: string;
  matchReason: string;
  complementarySkills: string[];
  sharedCourseCount: number;
}

interface MatchRequest {
  id: string;
  requesterId: string;
  matchedUserId: string;
  courseId?: string | null;
  matchReason: string;
  status: string;
  createdAt: string;
}

export function PeerMatchingPage() {
  const [mounted, setMounted] = useState(false);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [peerMatchesResult] = useQuery({
    query: PEER_MATCHES_QUERY,
    pause: !mounted,
  });

  const [myRequestsResult] = useQuery({
    query: MY_MATCH_REQUESTS_QUERY,
    pause: !mounted,
  });

  const [, requestPeerMatch] = useMutation(REQUEST_PEER_MATCH_MUTATION);
  const [, respondToPeerMatch] = useMutation(RESPOND_PEER_MATCH_MUTATION);

  const peerMatches: PeerMatch[] = peerMatchesResult.data?.peerMatches ?? [];
  const matchRequests: MatchRequest[] = myRequestsResult.data?.myPeerMatchRequests ?? [];

  const incomingRequests = matchRequests.filter((r) => r.status === 'PENDING');
  const outgoingRequests = matchRequests.filter((r) => r.status !== 'PENDING');

  const handleConnect = async (matchedUserId: string) => {
    setConnectingUserId(matchedUserId);
    await requestPeerMatch({ matchedUserId });
    setConnectingUserId(null);
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    setRespondingId(requestId);
    await respondToPeerMatch({ requestId, accept });
    setRespondingId(null);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Peer Matching</h1>

        {/* Suggested Matches */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-3">
            Suggested Matches
            <span className="ml-2 text-xs font-normal text-muted-foreground">(AI-powered)</span>
          </h2>

          {peerMatchesResult.fetching && (
            <p className="text-sm text-muted-foreground">Finding matches...</p>
          )}
          {!peerMatchesResult.fetching && peerMatches.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No suggested matches available yet</p>
            </div>
          )}
          {peerMatches.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {peerMatches.map((match) => (
                <MatchCard
                  key={match.userId}
                  userId={match.userId}
                  matchReason={match.matchReason}
                  complementarySkills={match.complementarySkills}
                  sharedCourseCount={match.sharedCourseCount}
                  onConnect={handleConnect}
                  isConnecting={connectingUserId === match.userId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Match Requests */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Match Requests</h2>

          {myRequestsResult.fetching && (
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          )}

          {!myRequestsResult.fetching && matchRequests.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No match requests yet</p>
            </div>
          )}

          {incomingRequests.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Incoming
              </h3>
              <div className="flex flex-col gap-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Learner {req.requesterId.slice(0, 6)}
                      </p>
                      <p className="text-xs text-muted-foreground">{req.matchReason}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(req.id, true)}
                        disabled={respondingId === req.id}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, false)}
                        disabled={respondingId === req.id}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outgoingRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Sent
              </h3>
              <div className="flex flex-col gap-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Learner {req.matchedUserId.slice(0, 6)}
                      </p>
                      <p className="text-xs text-muted-foreground">{req.matchReason}</p>
                    </div>
                    <span
                      className={[
                        'text-xs font-medium rounded-full px-2 py-0.5',
                        req.status === 'ACCEPTED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : req.status === 'DECLINED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
