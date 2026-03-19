import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { MultipleChoiceQuestion } from '@/components/quiz/MultipleChoiceQuestion';
import { DragOrderQuestion } from '@/components/quiz/DragOrderQuestion';
import { HotspotQuestion } from '@/components/quiz/HotspotQuestion';
import { MatchingQuestion } from '@/components/quiz/MatchingQuestion';
import { FillBlankQuestion } from '@/components/quiz/FillBlankQuestion';
import type { QuizItem } from '@/types/quiz';
import { cn } from '@/lib/utils';

interface Props {
  questionNumber: number;
  totalQuestions: number;
  questionData: QuizItem;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  flagged: boolean;
  onToggleFlag: () => void;
}

function renderByType(
  data: QuizItem,
  answer: unknown,
  onAnswer: (v: unknown) => void,
) {
  switch (data.type) {
    case 'MULTIPLE_CHOICE':
      return (
        <MultipleChoiceQuestion
          item={data}
          value={(answer as string[]) ?? []}
          onChange={onAnswer}
        />
      );
    case 'DRAG_ORDER':
      return (
        <DragOrderQuestion
          item={data}
          value={(answer as string[]) ?? []}
          onChange={onAnswer}
        />
      );
    case 'HOTSPOT':
      return (
        <HotspotQuestion
          item={data}
          value={(answer as string[]) ?? []}
          onChange={onAnswer}
        />
      );
    case 'MATCHING':
      return (
        <MatchingQuestion
          item={data}
          value={(answer as Array<{ leftId: string; rightId: string }>) ?? []}
          onChange={onAnswer}
        />
      );
    case 'FILL_BLANK':
      return (
        <FillBlankQuestion
          item={data}
          value={(answer as string) ?? ''}
          onChange={onAnswer}
        />
      );
    default:
      return <p className="text-muted-foreground">Unsupported question type</p>;
  }
}

export function ExamQuestionRenderer({
  questionNumber,
  totalQuestions,
  questionData,
  answer,
  onAnswer,
  flagged,
  onToggleFlag,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          Question {questionNumber} of {totalQuestions}
        </Badge>
        <Button
          variant={flagged ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleFlag}
          className={cn(flagged && 'bg-orange-500 hover:bg-orange-600')}
          aria-pressed={flagged}
        >
          <Flag className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          {flagged ? 'Flagged' : 'Flag for Review'}
        </Button>
      </div>

      {renderByType(questionData, answer, onAnswer)}
    </div>
  );
}
