/**
 * CatExamPlayer — Adaptive exam player for Computer Adaptive Testing.
 *
 * One-way navigation (no back), server-driven item selection,
 * immediate termination when CAT criteria met.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CatProgressIndicator } from './CatProgressIndicator';
import { SecureExamWrapper } from './SecureExamWrapper';
import { CatExamTimer } from './CatExamTimer';
import { CatQuestionCard } from './CatQuestionCard';
import type { ExamItem } from '@/types/exam-entities';

interface CatExamPlayerProps {
  sessionId: string;
  initialItem: ExamItem;
  minItems: number;
  maxItems: number;
  timeLimitSeconds: number;
  lockdownEnabled?: boolean;
  onComplete: (result: CatExamResult) => void;
}

export interface CatExamResult {
  sessionId: string;
  theta: number;
  se: number;
  reason: string;
}

export function CatExamPlayer({
  sessionId,
  initialItem,
  minItems,
  maxItems,
  timeLimitSeconds,
  lockdownEnabled = true,
  onComplete,
}: CatExamPlayerProps) {
  const [currentItem, setCurrentItem] = useState<ExamItem>(initialItem);
  const [itemNumber, setItemNumber] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const submitAndGetNext = useCallback(async () => {
    if (!selectedAnswer || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/exam/cat-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          itemId: currentItem.id,
          answer: selectedAnswer,
        }),
      });
      const data = (await res.json()) as {
        terminated: boolean;
        item?: ExamItem;
        result?: CatExamResult;
      };
      if (!mountedRef.current) return;
      if (data.terminated && data.result) {
        setIsTerminated(true);
        onComplete(data.result);
      } else if (data.item) {
        setCurrentItem(data.item);
        setItemNumber((n) => n + 1);
        setSelectedAnswer(null);
      }
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  }, [sessionId, currentItem.id, selectedAnswer, isSubmitting, onComplete]);

  const handleTerminate = useCallback(
    (reason: string) => {
      setIsTerminated(true);
      onComplete({ sessionId, theta: 0, se: 9.99, reason });
    },
    [sessionId, onComplete]
  );

  if (isTerminated) return null;

  const qd = currentItem.questionData as {
    stem: string;
    options?: Array<{ id: string; text: string }>;
  };

  return (
    <SecureExamWrapper
      sessionId={sessionId}
      enabled={lockdownEnabled}
      onViolationThreshold={() => handleTerminate('VOIDED')}
    >
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <CatProgressIndicator
            currentItemNumber={itemNumber}
            minItems={minItems}
            maxItems={maxItems}
            className="flex-1"
          />
          <CatExamTimer
            totalSeconds={timeLimitSeconds}
            onExpired={() => handleTerminate('TIME_EXPIRED')}
            className="ml-4"
          />
        </div>

        <CatQuestionCard
          stem={qd.stem}
          options={qd.options ?? []}
          selectedAnswer={selectedAnswer}
          onSelect={setSelectedAnswer}
        />

        <div className="flex justify-end">
          <Button
            onClick={submitAndGetNext}
            disabled={!selectedAnswer || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Next'}
          </Button>
        </div>
      </div>
    </SecureExamWrapper>
  );
}
