import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useExamResult, useExamSession } from '@/hooks/useExamSession';
import {
  DomainScoreChart,
  BloomScoreChart,
} from '@/components/exam/ExamResultChart';
import { ExamScoreCard } from '@/components/exam/ExamScoreCard';
import { cn } from '@/lib/utils';

export function ExamResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { result, loading } = useExamResult(sessionId ?? '');
  const { session } = useExamSession(sessionId ?? '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Exam result not found.</p>
      </div>
    );
  }

  const scoreDisplay = result.scaledScore ?? Math.round(result.rawScore * 100);
  const scoreMax = result.scaledScore ? 1000 : 100;

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-6">
      {/* Pass/Fail banner */}
      <Card
        className={cn(
          'border-2',
          result.passed ? 'border-green-500' : 'border-red-500'
        )}
      >
        <CardContent className="p-6 text-center space-y-3">
          {result.passed ? (
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto dark:text-green-400" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500 mx-auto dark:text-red-400" />
          )}
          <h1 className="text-2xl font-bold">
            {result.passed
              ? 'Congratulations — You Passed!'
              : 'Exam Not Passed'}
          </h1>
          <Badge
            variant={result.passed ? 'default' : 'destructive'}
            className="text-lg px-4 py-1"
          >
            {result.passed ? 'PASS' : 'FAIL'}
          </Badge>
        </CardContent>
      </Card>

      <ExamScoreCard
        result={result}
        scoreDisplay={scoreDisplay}
        scoreMax={scoreMax}
      />

      {result.domainScores.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <DomainScoreChart
              scores={result.domainScores}
              passingPercentage={70}
            />
          </CardContent>
        </Card>
      )}

      {result.bloomScores.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <BloomScoreChart scores={result.bloomScores} />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
          Back to Course
        </Button>
        <Button
          className="flex-1"
          disabled={!result.blueprintId && !session?.blueprintId}
          onClick={() =>
            navigate(
              `/exams/${result.blueprintId ?? session?.blueprintId}/start`
            )
          }
        >
          <RotateCcw className="h-4 w-4 mr-2" aria-hidden />
          Retake Exam
        </Button>
      </div>
    </div>
  );
}
