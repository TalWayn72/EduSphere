/**
 * PollWidget — live poll creation, voting, and real-time results.
 * Moderator view: create + activate/close. Learner view: vote + see results.
 */
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useSubscription } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  SESSION_POLLS_QUERY,
  CREATE_POLL_MUTATION,
  ACTIVATE_POLL_MUTATION,
  CLOSE_POLL_MUTATION,
  VOTE_POLL_MUTATION,
  POLL_UPDATED_SUBSCRIPTION,
  POLL_RESULTS_QUERY,
} from '@/lib/graphql/live-session.queries';

interface PollOption {
  text: string;
  count: number;
  percentage: number;
}
interface PollResultsData {
  pollId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
}
interface SessionPollData {
  id: string;
  sessionId: string;
  question: string;
  options: string[];
  isActive: boolean;
}

interface PollWidgetProps {
  sessionId: string;
  isModerator: boolean;
}

function PollResults({
  pollId,
  tenantId: _tenantId,
}: {
  pollId: string;
  tenantId?: string;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => () => setPaused(true), []);

  const [{ data: subData }] = useSubscription({
    query: POLL_UPDATED_SUBSCRIPTION,
    variables: { pollId },
    pause: paused,
  });
  const [{ data: queryData }] = useQuery({
    query: POLL_RESULTS_QUERY,
    variables: { pollId },
  });

  const results: PollResultsData | undefined =
    (subData as { pollUpdated?: PollResultsData } | undefined)?.pollUpdated ??
    (queryData as { pollResults?: PollResultsData } | undefined)?.pollResults;

  if (!results)
    return <p className="text-xs text-muted-foreground">Loading results...</p>;

  return (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-muted-foreground">
        {results.totalVotes} votes
      </p>
      {results.options.map((opt) => (
        <div key={opt.text} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{opt.text}</span>
            <span className="text-muted-foreground">{opt.percentage}%</span>
          </div>
          <Progress value={opt.percentage} className="h-2" />
        </div>
      ))}
    </div>
  );
}

export function PollWidget({ sessionId, isModerator }: PollWidgetProps) {
  const [question, setQuestion] = useState('');
  const [optionInputs, setOptionInputs] = useState(['', '']);
  const [votedPollIds, setVotedPollIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    []
  );

  const [{ data: pollsData }, refetchPolls] = useQuery({
    query: SESSION_POLLS_QUERY,
    variables: { sessionId },
  });
  const [, createPoll] = useMutation(CREATE_POLL_MUTATION);
  const [, activatePoll] = useMutation(ACTIVATE_POLL_MUTATION);
  const [, closePoll] = useMutation(CLOSE_POLL_MUTATION);
  const [, votePoll] = useMutation(VOTE_POLL_MUTATION);

  const polls: SessionPollData[] =
    (pollsData as { sessionPolls?: SessionPollData[] } | undefined)
      ?.sessionPolls ?? [];

  const handleCreate = async () => {
    const opts = optionInputs.filter((o) => o.trim().length > 0);
    if (!question.trim() || opts.length < 2) return;
    await createPoll({ sessionId, question: question.trim(), options: opts });
    setQuestion('');
    setOptionInputs(['', '']);
    refetchPolls({ requestPolicy: 'network-only' });
  };

  const handleVote = async (pollId: string, idx: number) => {
    await votePoll({ pollId, optionIndex: idx });
    setVotedPollIds((prev) => new Set(prev).add(pollId));
  };

  const activePolls = polls.filter((p) => p.isActive);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Live Polls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isModerator && (
          <div className="space-y-2 border rounded p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Create Poll
            </p>
            <Input
              placeholder="Poll question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="text-sm"
            />
            {optionInputs.map((opt, i) => (
              <Input
                key={i}
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const next = [...optionInputs];
                  next[i] = e.target.value;
                  setOptionInputs(next);
                }}
                className="text-sm"
              />
            ))}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOptionInputs([...optionInputs, ''])}
              >
                + Option
              </Button>
              <Button size="sm" onClick={() => void handleCreate()}>
                Create
              </Button>
            </div>
          </div>
        )}

        {polls.map((poll) => (
          <div key={poll.id} className="border rounded p-3 space-y-2">
            <p className="text-sm font-medium">{poll.question}</p>
            {isModerator ? (
              <div className="flex gap-2">
                {!poll.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await activatePoll({ pollId: poll.id });
                      refetchPolls({ requestPolicy: 'network-only' });
                    }}
                  >
                    Activate
                  </Button>
                )}
                {poll.isActive && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await closePoll({ pollId: poll.id });
                      refetchPolls({ requestPolicy: 'network-only' });
                    }}
                  >
                    Close Poll
                  </Button>
                )}
              </div>
            ) : (
              !votedPollIds.has(poll.id) &&
              poll.isActive && (
                <div className="space-y-1">
                  {poll.options.map((opt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => void handleVote(poll.id, i)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )
            )}
            {(isModerator || votedPollIds.has(poll.id) || !poll.isActive) && (
              <PollResults pollId={poll.id} />
            )}
          </div>
        ))}

        {activePolls.length === 0 && !isModerator && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No active polls
          </p>
        )}
      </CardContent>
    </Card>
  );
}
