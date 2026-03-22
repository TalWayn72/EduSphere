import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  FileQuestion,
  Target,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useExamBlueprint, useStartExamSession } from '@/hooks/useExamSession';
import { useExamSessionStore } from '@/stores/exam-session.store';

const INSTRUCTIONS = [
  'Do not navigate away from this page during the exam.',
  'The timer is enforced. When time expires, your exam will be submitted automatically.',
  'You may flag questions for review and return to them before submitting.',
  'Each question is saved as you answer it.',
  'Once submitted, the exam cannot be reopened.',
];

export function ExamStartPage() {
  const { blueprintId } = useParams<{ blueprintId: string }>();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const { blueprint, loading: bpLoading } = useExamBlueprint(blueprintId ?? '');
  const { startSession, loading: starting, error } = useStartExamSession();
  const setSession = useExamSessionStore((s) => s.setSession);

  const handleStart = async () => {
    if (!blueprintId) return;
    const session = await startSession(blueprintId);
    if (!session) return;
    setSession(
      session.id,
      session.questionOrder ?? [],
      session.timeRemainingSeconds ?? 0,
    );
    navigate(`/exam/session/${session.id}`, { replace: true });
  };

  if (bpLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Exam blueprint not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{blueprint.title}</h1>
            {blueprint.description && (
              <p className="text-sm text-muted-foreground">
                {blueprint.description}
              </p>
            )}
          </div>

          {/* Exam info badges */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <FileQuestion className="h-3.5 w-3.5" aria-hidden />
              {blueprint.totalQuestions} questions
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {blueprint.timeLimitMinutes} minutes
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Target className="h-3.5 w-3.5" aria-hidden />
              Passing: {blueprint.passingScore}
              {blueprint.passingMethod === 'PERCENTAGE' ? '%' : ' pts'}
            </Badge>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" aria-hidden />
              Exam Instructions
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {INSTRUCTIONS.map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Agreement */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
            <span className="text-sm">
              I understand the exam rules and am ready to begin.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400" role="alert">{error}</p>
          )}

          <Button
            onClick={handleStart}
            disabled={!agreed || starting}
            className="w-full"
            size="lg"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
                Starting...
              </>
            ) : (
              'Start Exam'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
