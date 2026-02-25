/**
 * TextSubmissionForm — text assignment submission UI (F-005)
 *
 * Shows a textarea, live word count, submit button.
 * After a successful submit, displays a "plagiarism check in progress" notice.
 */
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSubmitAssignment } from '@/hooks/useSubmitAssignment';

const MIN_WORDS = 10;
const MAX_CHARS = 50_000;

interface TextSubmissionFormProps {
  contentItemId: string;
  courseId: string;
  onSubmitted?: (submissionId: string) => void;
}

export function TextSubmissionForm({
  contentItemId,
  courseId,
  onSubmitted,
}: TextSubmissionFormProps) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = timeoutRef.current;
    return () => {
      if (id !== null) {
        clearTimeout(id);
      }
    };
  }, []);

  const { submit, loading, error } = useSubmitAssignment(contentItemId, courseId);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = wordCount >= MIN_WORDS && text.length <= MAX_CHARS && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const result = await submit(text);
    if (result) {
      setSubmitted(true);
      onSubmitted?.(result.id);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p className="font-semibold">Submitted successfully.</p>
        <p className="mt-1 text-green-700">
          Plagiarism check in progress. Results will be available shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="assignment-text" className="text-sm font-medium">
          Your Answer
        </Label>
        <Textarea
          id="assignment-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your assignment response here..."
          className="mt-1 min-h-[200px]"
          maxLength={MAX_CHARS}
          disabled={loading}
        />
        <p className={`mt-1 text-xs ${wordCount < MIN_WORDS ? 'text-red-500' : 'text-gray-500'}`}>
          {wordCount} word{wordCount !== 1 ? 's' : ''}
          {wordCount < MIN_WORDS ? ` (minimum ${MIN_WORDS} required)` : ''}
          {' '}· {MAX_CHARS - text.length} characters remaining
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded border border-red-200 bg-red-50 p-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {loading ? 'Submitting...' : 'Submit Assignment'}
      </Button>
    </form>
  );
}
