import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { ExamResult } from '@/types/exam-entities';

interface Props {
  result: ExamResult;
  scoreDisplay: number;
  scoreMax: number;
}

export function ExamScoreCard({ result, scoreDisplay, scoreMax }: Props) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <p className="text-5xl font-mono font-bold text-primary">
            {scoreDisplay}
          </p>
          <p className="text-sm text-muted-foreground">out of {scoreMax}</p>
        </div>

        {result.confidenceInterval && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              95% Confidence Interval
            </p>
            <div className="relative h-3 bg-muted rounded-full">
              <div
                className="absolute h-full bg-primary/30 rounded-full"
                style={{
                  left: `${Math.max(0, result.confidenceInterval.lower / 10)}%`,
                  width: `${Math.min(100, (result.confidenceInterval.upper - result.confidenceInterval.lower) / 10)}%`,
                }}
              />
              <div
                className="absolute h-full w-1 bg-primary rounded-full"
                style={{ left: `${Math.min(100, scoreDisplay / 10)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(result.confidenceInterval.lower)}</span>
              <span>{Math.round(result.confidenceInterval.upper)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Completed: {new Date(result.gradedAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
