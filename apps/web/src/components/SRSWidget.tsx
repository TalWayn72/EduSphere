/**
 * SRSWidget — Dashboard card showing the spaced-repetition review queue.
 * Displays count of due cards and an inline review session when started.
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'urql';
import { Brain } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SRSReviewSession } from '@/components/SRSReviewSession';
import {
  SRS_QUEUE_COUNT_QUERY,
  DUE_REVIEWS_QUERY,
  CREATE_REVIEW_CARD_MUTATION,
} from '@/lib/graphql/srs.queries';

interface SrsQueueCountResult {
  srsQueueCount: number;
}

interface DueReviewsResult {
  dueReviews: { id: string; conceptName: string }[];
}

interface CreateCardResult {
  createReviewCard: { id: string };
}

type WidgetMode = 'idle' | 'reviewing';

export function SRSWidget() {
  const [mode, setMode] = useState<WidgetMode>('idle');
  const pauseRef = useRef(false);

  const [countResult, refetchCount] = useQuery<SrsQueueCountResult>({
    query: SRS_QUEUE_COUNT_QUERY,
    pause: pauseRef.current,
  });

  const [reviewsResult] = useQuery<DueReviewsResult>({
    query: DUE_REVIEWS_QUERY,
    variables: { limit: 50 },
    pause: mode !== 'reviewing',
  });

  const [, createCard] = useMutation<CreateCardResult>(CREATE_REVIEW_CARD_MUTATION);

  // Pause subscription on unmount to avoid dangling requests
  useEffect(() => {
    return () => { pauseRef.current = true; };
  }, []);

  const queueCount = countResult.data?.srsQueueCount ?? 0;
  const cards = reviewsResult.data?.dueReviews ?? [];
  const loading = countResult.fetching;

  const handleStartReview = () => {
    setMode('reviewing');
  };

  const handleReviewComplete = () => {
    setMode('idle');
    refetchCount({ requestPolicy: 'network-only' });
  };

  const handleAddDemo = async () => {
    await createCard({ conceptName: 'Sample concept — edit me!' });
    refetchCount({ requestPolicy: 'network-only' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Review Queue</CardTitle>
        <Brain className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {mode === 'reviewing' ? (
          <SRSReviewSession
            cards={cards}
            onComplete={handleReviewComplete}
          />
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">
                {loading ? '...' : queueCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {queueCount === 1 ? 'card due for review' : 'cards due for review'}
              </p>
            </div>

            {queueCount > 0 && (
              <Button size="sm" onClick={handleStartReview} className="w-full">
                Start Review
              </Button>
            )}

            {queueCount === 0 && !loading && (
              <div className="space-y-2">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  All caught up!
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleAddDemo()}
                  className="w-full text-xs"
                >
                  + Add Review Card
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
