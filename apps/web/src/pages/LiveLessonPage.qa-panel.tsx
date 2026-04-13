/**
 * QAPanel — Q&A tab for LiveLessonPage.
 *
 * - useLiveQA for questions + ask/upvote/answer/dismiss
 * - Question submission form
 * - Questions sorted by upvotes (via hook)
 * - Status badge per question (OPEN / ANSWERED / DISMISSED)
 * - Instructor view: answer input + dismiss button
 */
import { useState } from 'react';
import { ThumbsUp, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLiveQA } from '@/hooks/useLiveQA';
import type { LiveQAQuestion } from '@/types/live-session.types';
import { cn } from '@/lib/utils';

interface QAPanelProps {
  sessionId: string;
  isInstructor?: boolean;
}

export function QAPanel({ sessionId, isInstructor = false }: QAPanelProps) {
  const { sortedQuestions, fetching, askQuestion, upvoteQuestion, answerQuestion, dismissQuestion } =
    useLiveQA(sessionId);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAsk = async () => {
    const trimmed = draft.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await askQuestion(trimmed);
      setDraft('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="qa-panel">
      {/* Ask question form */}
      <div className="border-b p-3 shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="שאל שאלה…"
            rows={2}
            className="resize-none flex-1 text-sm"
            dir="auto"
            aria-label="Your question"
            disabled={submitting}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => { void handleAsk(); }}
            disabled={!draft.trim() || submitting}
            className="self-end"
          >
            שאל
          </Button>
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!fetching && sortedQuestions.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <p dir="auto">No questions yet.</p>
          </div>
        )}

        {sortedQuestions.map((q) => (
          <QuestionItem
            key={q.id}
            question={q}
            isInstructor={isInstructor}
            onUpvote={() => { void upvoteQuestion(q.id); }}
            onAnswer={(answer) => { void answerQuestion(q.id, answer); }}
            onDismiss={() => { void dismissQuestion(q.id); }}
          />
        ))}
      </div>
    </div>
  );
}

// ── QuestionItem ──────────────────────────────────────────────────────────────

interface QuestionItemProps {
  question: LiveQAQuestion;
  isInstructor: boolean;
  onUpvote: () => void;
  onAnswer: (answer: string) => void;
  onDismiss: () => void;
}

function QuestionItem({ question, isInstructor, onUpvote, onAnswer, onDismiss }: QuestionItemProps) {
  const [answerDraft, setAnswerDraft] = useState('');

  const statusVariant =
    question.status === 'ANSWERED' ? 'default' :
    question.status === 'DISMISSED' ? 'secondary' : 'outline';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        question.status === 'ANSWERED' && 'border-green-300 dark:border-green-700',
        question.status === 'DISMISSED' && 'opacity-60'
      )}
      data-testid="qa-question"
    >
      <div className="flex items-start gap-2">
        {/* Upvote */}
        <button
          type="button"
          onClick={onUpvote}
          disabled={question.status === 'DISMISSED'}
          className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors disabled:cursor-not-allowed"
          aria-label={`Upvote (${question.upvotes})`}
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs tabular-nums">{question.upvotes}</span>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed" dir="auto">{question.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground" dir="auto">{question.displayName}</span>
            <Badge variant={statusVariant} className="text-xs h-4 px-1.5">
              {question.status === 'ANSWERED' && <CheckCircle className="h-2.5 w-2.5 mr-0.5" />}
              {question.status === 'DISMISSED' && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
              {question.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Answer */}
      {question.status === 'ANSWERED' && question.answer && (
        <div className="ml-8 pl-3 border-l-2 border-green-400 text-sm text-muted-foreground" dir="auto">
          {question.answer}
        </div>
      )}

      {/* Instructor controls */}
      {isInstructor && question.status === 'OPEN' && (
        <div className="ml-8 flex flex-col gap-1.5">
          <Textarea
            value={answerDraft}
            onChange={(e) => setAnswerDraft(e.target.value)}
            placeholder="Answer…"
            rows={2}
            className="resize-none text-xs"
            dir="auto"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs"
              onClick={() => { onAnswer(answerDraft); setAnswerDraft(''); }}
              disabled={!answerDraft.trim()}
            >
              Answer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
