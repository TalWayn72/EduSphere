import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ExamPlayer } from '@/components/exam/ExamPlayer';
import { useExamSessionStore, type ExamQuestion } from '@/stores/exam-session.store';
import {
  useExamSession,
  useSubmitExam,
} from '@/hooks/useExamSession';

export function ExamTakingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const store = useExamSessionStore();
  const { session, loading } = useExamSession(sessionId ?? '');
  const { submitExam, loading: submitting } = useSubmitExam();

  // Hydrate store from server if not already set (e.g., page refresh)
  useEffect(() => {
    if (session && !store.sessionId) {
      const questions: ExamQuestion[] = (session.questionOrder ?? []).map(
        (id: string) => ({
          itemId: id,
          questionData: { type: 'MULTIPLE_CHOICE' as const, question: '', options: [], correctOptionIds: [] },
          domain: '',
          bloomLevel: '',
        }),
      );
      store.setSession(
        session.id,
        questions,
        session.timeRemainingSeconds ?? 0,
      );
    }
  }, [session, store]);

  // Mark submitting state in store
  useEffect(() => {
    store.setSubmitting(submitting);
  }, [submitting, store]);

  // Reset store on unmount
  useEffect(() => {
    return () => {
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!sessionId) return;
    store.setSubmitting(true);
    const result = await submitExam(sessionId);
    store.setSubmitting(false);
    if (result) {
      navigate(`/exam/result/${sessionId}`, { replace: true });
    }
  };

  if (loading && !store.sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <h1 className="sr-only">Exam</h1>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store.sessionId && !loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">
          Exam session not found or already completed.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <ExamPlayer
        examTitle="Certification Exam"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
