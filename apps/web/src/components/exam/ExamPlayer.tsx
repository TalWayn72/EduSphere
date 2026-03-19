import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExamTimer } from './ExamTimer';
import { ExamNavigationSidebar } from './ExamNavigationSidebar';
import { ExamQuestionRenderer } from './ExamQuestionRenderer';
import { useExamTimer } from '@/hooks/useExamTimer';
import { useExamSessionStore } from '@/stores/exam-session.store';
import { useSubmitExamAnswer } from '@/hooks/useExamSession';

interface Props {
  examTitle: string;
  onSubmit: () => void;
}

export function ExamPlayer({ examTitle, onSubmit }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const store = useExamSessionStore();
  const { submitAnswer } = useSubmitExamAnswer();

  const handleExpire = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  const timer = useExamTimer(store.timeRemaining, handleExpire);

  const currentQuestion = store.questions[store.currentIndex];

  const answeredIds = useMemo(
    () => new Set(Object.keys(store.answers)),
    [store.answers],
  );

  const questionItemIds = useMemo(
    () => store.questions.map((q) => q.itemId),
    [store.questions],
  );

  const handleAnswer = useCallback(
    (value: unknown) => {
      if (!currentQuestion || !store.sessionId) return;
      store.setAnswer(currentQuestion.itemId, value);
      submitAnswer(store.sessionId, currentQuestion.itemId, value);
    },
    [currentQuestion, store, submitAnswer],
  );

  const handleToggleFlag = useCallback(() => {
    if (!currentQuestion) return;
    store.toggleFlag(currentQuestion.itemId);
  }, [currentQuestion, store]);

  if (!currentQuestion) return null;

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)]">
      {/* Main question area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold truncate">{examTitle}</h1>
          <ExamTimer {...timer} />
        </div>

        {/* Question card */}
        <Card className="flex-1 overflow-auto">
          <CardContent className="p-6">
            <ExamQuestionRenderer
              questionNumber={store.currentIndex + 1}
              totalQuestions={store.questions.length}
              questionData={currentQuestion.questionData}
              answer={store.answers[currentQuestion.itemId]}
              onAnswer={handleAnswer}
              flagged={store.flagged.has(currentQuestion.itemId)}
              onToggleFlag={handleToggleFlag}
            />
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={store.currentIndex === 0}
            onClick={store.previousQuestion}
          >
            Previous
          </Button>
          <Button
            disabled={store.currentIndex === store.questions.length - 1}
            onClick={store.nextQuestion}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-52 shrink-0">
        <Card className="h-full">
          <CardContent className="p-3 h-full">
            <ExamNavigationSidebar
              totalQuestions={store.questions.length}
              currentIndex={store.currentIndex}
              answeredIds={answeredIds}
              flaggedIds={store.flagged}
              questionItemIds={questionItemIds}
              onGoTo={store.goToQuestion}
              onSubmit={() => setConfirmOpen(true)}
              isSubmitting={store.isSubmitting}
            />
          </CardContent>
        </Card>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
            <DialogDescription>
              You have answered {answeredIds.size} of {store.questions.length} questions.
              {store.flagged.size > 0 && (
                <> {store.flagged.size} question(s) are flagged for review.</>
              )}
              {' '}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Continue Exam
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onSubmit();
              }}
            >
              Submit Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
