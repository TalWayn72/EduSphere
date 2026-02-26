import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { DragOrderQuestion } from './DragOrderQuestion';
import { HotspotQuestion } from './HotspotQuestion';
import { MatchingQuestion } from './MatchingQuestion';
import { LikertQuestion } from './LikertQuestion';
import { FillBlankQuestion } from './FillBlankQuestion';
import { QuizResultView } from './QuizResultView';
import type { QuizContent, QuizItem, QuizResult } from '@/types/quiz';
import { useGradeQuiz } from '@/hooks/useGradeQuiz';

interface Props {
  quizContent: QuizContent;
  contentItemId: string;
}

type AnswerMap = Record<number, unknown>;

function renderQuestion(
  item: QuizItem,
  idx: number,
  answers: AnswerMap,
  setAnswer: (idx: number, v: unknown) => void,
  submitted: boolean
) {
  const val = answers[idx];
  const disabled = submitted;

  switch (item.type) {
    case 'MULTIPLE_CHOICE':
      return (
        <MultipleChoiceQuestion
          item={item}
          value={(val as string[]) ?? []}
          onChange={(v) => setAnswer(idx, v)}
          disabled={disabled}
        />
      );
    case 'DRAG_ORDER':
      return (
        <DragOrderQuestion
          item={item}
          value={(val as string[]) ?? []}
          onChange={(v) => setAnswer(idx, v)}
          disabled={disabled}
        />
      );
    case 'HOTSPOT':
      return (
        <HotspotQuestion
          item={item}
          value={(val as string[]) ?? []}
          onChange={(v) => setAnswer(idx, v)}
          disabled={disabled}
        />
      );
    case 'MATCHING':
      return (
        <MatchingQuestion
          item={item}
          value={(val as Array<{ leftId: string; rightId: string }>) ?? []}
          onChange={(v) => setAnswer(idx, v)}
          disabled={disabled}
        />
      );
    case 'LIKERT':
      return (
        <LikertQuestion
          item={item}
          value={(val as number) ?? null}
          onChange={(v) => setAnswer(idx, v)}
          disabled={disabled}
        />
      );
    case 'FILL_BLANK':
      return (
        <FillBlankQuestion
          item={item}
          value={(val as string) ?? ''}
          onChange={(v) => setAnswer(idx, v)}
          disabled={disabled}
        />
      );
  }
}

export function QuizPlayer({ quizContent, contentItemId }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const { gradeQuiz, loading } = useGradeQuiz(contentItemId);

  const setAnswer = (idx: number, val: unknown) => {
    setAnswers((prev) => ({ ...prev, [idx]: val }));
  };

  const handleSubmit = async () => {
    const res = await gradeQuiz(answers);
    if (res) setResult(res);
  };

  const item = quizContent.items[currentIdx];
  const total = quizContent.items.length;
  const isLast = currentIdx === total - 1;
  const submitted = result !== null;

  if (result) {
    return (
      <QuizResultView
        result={result}
        quiz={quizContent}
        onRetry={() => {
          setResult(null);
          setCurrentIdx(0);
          setAnswers({});
        }}
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {currentIdx + 1} of {total}
          </span>
          <span className="text-primary font-medium">
            {Math.round(((currentIdx + 1) / total) * 100)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
          />
        </div>

        {item &&
          renderQuestion(item, currentIdx, answers, setAnswer, submitted)}

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => i - 1)}
          >
            Previous
          </Button>
          {isLast ? (
            <Button size="sm" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setCurrentIdx((i) => i + 1)}>
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
