import { useState } from 'react';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
  explanation?: string;
}

export interface MicrolessonData {
  id: string;
  objective: string;
  conceptName: string;
  body: string;
  durationSeconds: number;
  quizQuestion?: QuizQuestion;
}

interface MicrolessonCardProps {
  lesson: MicrolessonData;
  currentIndex: number;
  totalCount: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onComplete?: (lessonId: string) => void;
  isCompleted?: boolean;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex gap-1.5 justify-center"
      aria-label={`Lesson ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i === current
              ? 'bg-primary'
              : i < current
                ? 'bg-primary/50'
                : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

function QuizSection({ quiz }: { quiz: QuizQuestion }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <p className="text-sm font-semibold">Quick Check: {quiz.question}</p>
      <div className="space-y-2">
        {quiz.options.map((opt, i) => {
          const isSelected = selected === i;
          let cls =
            'w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ';
          if (!answered) cls += 'hover:bg-accent cursor-pointer';
          else if (opt.isCorrect)
            cls += 'border-green-500 bg-green-50 text-green-800';
          else if (isSelected)
            cls += 'border-destructive bg-destructive/10 text-destructive';
          else cls += 'opacity-50';
          return (
            <button
              key={i}
              className={cls}
              disabled={answered}
              onClick={() => setSelected(i)}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      {answered && quiz.explanation && (
        <p className="text-xs text-muted-foreground italic">
          {quiz.explanation}
        </p>
      )}
      {answered && selected !== null && !quiz.options[selected]?.isCorrect && (
        <p className="text-xs text-destructive">
          Correct: {quiz.options.find((o) => o.isCorrect)?.text}
        </p>
      )}
    </div>
  );
}

export function MicrolessonCard({
  lesson,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  onComplete,
  isCompleted,
}: MicrolessonCardProps) {
  const minutes = Math.floor(lesson.durationSeconds / 60);
  const seconds = lesson.durationSeconds % 60;
  const durationLabel = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg border-0 bg-gradient-to-b from-background to-muted/30">
      <CardHeader className="pb-3 space-y-3">
        <ProgressDots current={currentIndex} total={totalCount} />
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground mb-1">
              {lesson.conceptName}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {durationLabel}
            </div>
          </div>
          {isCompleted && (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-1" />
          )}
        </div>
        <div className="flex items-start gap-2 text-sm bg-primary/5 rounded-md p-2">
          <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-primary font-medium leading-snug">
            {lesson.objective}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {lesson.body}
        </p>
        {lesson.quizQuestion && <QuizSection quiz={lesson.quizQuestion} />}
      </CardContent>

      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!onPrevious || currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Prev
        </Button>

        {!isCompleted && currentIndex === totalCount - 1 ? (
          <Button
            size="sm"
            onClick={() => onComplete?.(lesson.id)}
            className="gap-1"
          >
            <CheckCircle className="h-4 w-4" /> Mark Complete
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onNext}
            disabled={!onNext || currentIndex === totalCount - 1}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
