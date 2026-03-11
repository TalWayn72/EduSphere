/**
 * QuizBuilderPage — Instructor-side UI for creating quiz content items.
 * Route: /courses/:courseId/modules/:moduleId/quiz/new
 * Role gate: INSTRUCTOR / ORG_ADMIN / SUPER_ADMIN only.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useMutation } from 'urql';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthRole } from '@/hooks/useAuthRole';
import { QuizBuilderForm } from '@/components/quiz-builder/QuizBuilderForm';
import type { QuizQuestionItem } from '@/components/quiz-builder/QuizQuestion';
import { CREATE_CONTENT_ITEM_MUTATION } from '@/lib/graphql/content.queries';

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);
const DEFAULT_PASSING_SCORE = 70;

export function QuizBuilderPage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [passingScore, setPassingScore] = useState(DEFAULT_PASSING_SCORE);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [{ fetching, error }, createContentItem] = useMutation(CREATE_CONTENT_ITEM_MUTATION);

  if (mounted && role && !ALLOWED_ROLES.has(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (qs: QuizQuestionItem[], ps: number) => {
    setQuestions(qs);
    setPassingScore(ps);
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Quiz title is required.';
    if (questions.length === 0) return 'Add at least one question.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      if (!q.question.trim()) return `Question ${i + 1} text is required.`;
      if (q.choices.some((c) => !c.trim())) return `All choices in question ${i + 1} must be filled.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setValidationError(err); return; }
    setValidationError(null);

    const result = await createContentItem({
      input: {
        courseId,
        moduleId,
        title: title.trim(),
        contentType: 'QUIZ',
        body: JSON.stringify({ passingScore, items: questions }),
      },
    });

    if (result.error) {
      toast.error('Failed to create quiz. Please try again.');
      return;
    }
    toast.success('Quiz created successfully!');
    void navigate(`/courses/${courseId}`);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quiz Builder</CardTitle>
              <Button
                data-testid="generate-quiz-ai-btn"
                variant="outline"
                size="sm"
                onClick={() => setShowGenerateModal(true)}
                className="gap-2"
              >
                ✨ Generate from content
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6" noValidate>
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input
                  id="quiz-title"
                  placeholder="e.g. Module 1 Assessment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-required="true"
                />
              </div>

              <QuizBuilderForm
                questions={questions}
                passingScore={passingScore}
                onChange={handleChange}
              />

              {(validationError ?? error) && (
                <p role="alert" className="text-sm text-destructive">
                  {validationError ?? 'Failed to create quiz. Please try again.'}
                </p>
              )}

              <Button type="submit" disabled={fetching} className="w-full">
                {fetching ? 'Creating…' : 'Create Quiz'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent data-testid="generate-quiz-modal">
          <DialogHeader>
            <DialogTitle>✨ Generate Quiz from Content</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-500 text-center">
            <p className="text-2xl mb-3">🚧</p>
            <p className="font-semibold text-slate-700 mb-1">Coming in Phase 52</p>
            <p>
              Paste a lesson URL, upload a PDF, or select an existing lesson — and AI will
              generate quiz questions automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
