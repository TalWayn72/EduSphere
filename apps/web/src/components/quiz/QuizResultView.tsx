import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { QuizResult, QuizContent } from '@/types/quiz';

interface Props {
  result: QuizResult;
  quiz: QuizContent;
  onRetry: () => void;
}

export function QuizResultView({ result, quiz, onRetry }: Props) {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          {result.passed ? (
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          ) : (
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          )}
          <h2 className="text-xl font-bold">
            {result.passed ? 'Congratulations!' : 'Not quite — keep going!'}
          </h2>
          <p className="text-4xl font-mono font-bold text-primary">
            {result.score}%
          </p>
          <p className="text-sm text-muted-foreground">
            Passing score: {quiz.passingScore}%
          </p>
        </div>

        {quiz.showExplanations && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Question Review</h3>
            {result.itemResults.map((ir) => {
              const item = quiz.items[ir.itemIndex];
              return (
                <div
                  key={ir.itemIndex}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-sm
                    ${ir.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  {ir.correct ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{item?.question}</p>
                    {ir.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">{ir.explanation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button className="w-full" variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
