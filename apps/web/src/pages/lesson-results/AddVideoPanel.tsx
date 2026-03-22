import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { ADD_LESSON_ASSET_MUTATION } from '@/lib/graphql/lesson.queries';

// ── Quick Video URL adder (empty state) ──────────────────────────────────────

export function AddVideoPanel({ lessonId, courseId, lessonTitle }: {
  lessonId: string; courseId: string; lessonTitle: string;
}) {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [{ fetching }, addAsset] = useMutation(ADD_LESSON_ASSET_MUTATION);

  const handleAdd = async () => {
    if (!url.trim()) { setError('נא להזין קישור לסרטון'); return; }
    setError(null);
    const { error: addErr } = await addAsset({
      lessonId,
      input: { assetType: 'VIDEO', sourceUrl: url.trim() },
    });
    if (addErr) {
      const msg = addErr.graphQLErrors?.[0]?.message ?? addErr.message;
      console.error('[LessonResultsPage] addAsset failed:', msg, addErr);
      setError(msg);
      return;
    }
    navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-4 dark:bg-blue-950 dark:border-blue-700" data-testid="add-video-panel">
      <h3 className="font-semibold text-blue-800 mb-2 dark:text-blue-200">הוסף קישור לסרטון להרצת Pipeline</h3>
      <p className="text-sm text-blue-700 mb-3 dark:text-blue-300">
        הכנס קישור לסרטון (YouTube, Vimeo, URL ישיר) כדי להפעיל את ה-Pipeline ולקבל תמלול וסיכום.
      </p>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          data-testid="video-url-input"
          aria-label={`קישור לסרטון עבור שיעור ${lessonTitle}`}
        />
        <Button size="sm" onClick={handleAdd} disabled={fetching} data-testid="add-video-btn">
          {fetching ? 'מוסיף...' : 'הוסף ופתח Pipeline'}
        </Button>
      </div>
      {error && (
        <p className="text-red-600 text-xs mt-2 dark:text-red-400" data-testid="add-video-error" role="alert">{error}</p>
      )}
    </div>
  );
}
