import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'urql';
import {
  DUE_REVIEWS_QUERY,
  SUBMIT_REVIEW_MUTATION,
} from '@/lib/graphql/srs.queries';

export interface SrsCard {
  id: string;
  conceptName: string;
  dueDate: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lastReviewedAt: string | null;
}

interface DueReviewsData {
  dueReviews: SrsCard[];
}

interface SrsSessionStats {
  correct: number;
  incorrect: number;
}

export interface UseSrsSessionReturn {
  currentCard: SrsCard | null;
  totalDue: number;
  fetching: boolean;
  submitRating: (quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  sessionComplete: boolean;
  stats: SrsSessionStats;
}

export function useSrsSession(userId?: string): UseSrsSessionReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCards, setSessionCards] = useState<SrsCard[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const [result] = useQuery<DueReviewsData>({
    query: DUE_REVIEWS_QUERY,
    variables: { limit: 20 },
    pause: !userId,
  });

  const [, executeSubmit] = useMutation(SUBMIT_REVIEW_MUTATION);

  // Capture cards once on first successful fetch
  if (!initialized && result.data?.dueReviews && !result.fetching) {
    setSessionCards(result.data.dueReviews);
    setInitialized(true);
  }

  const submitRating = useCallback(
    (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
      const card = sessionCards[currentIndex];
      if (!card) return;

      void executeSubmit({ cardId: card.id, quality });

      if (quality >= 3) {
        setCorrectCount((c) => c + 1);
      } else {
        setIncorrectCount((c) => c + 1);
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex >= sessionCards.length) {
        setSessionComplete(true);
      } else {
        setCurrentIndex(nextIndex);
      }
    },
    [sessionCards, currentIndex, executeSubmit]
  );

  return {
    currentCard: sessionCards[currentIndex] ?? null,
    totalDue: sessionCards.length,
    fetching: result.fetching,
    submitRating,
    sessionComplete,
    stats: { correct: correctCount, incorrect: incorrectCount },
  };
}
