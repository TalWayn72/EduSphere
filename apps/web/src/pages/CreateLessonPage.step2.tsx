import { useState } from 'react';
import { useMutation } from 'urql';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ADD_LESSON_ASSET_MUTATION } from '@/lib/graphql/lesson.queries';

const youtubeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => url.includes('youtube.com') || url.includes('youtu.be'),
    'חייב להיות כתובת YouTube תקינה'
  );

interface Props {
  lessonId: string;
  courseId: string;
  onNext: () => void;
}

export function CreateLessonStep2({
  lessonId,
  courseId: _courseId,
  onNext,
}: Props) {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoError, setVideoError] = useState('');
  const [, addAsset] = useMutation(ADD_LESSON_ASSET_MUTATION);

  const handleAddVideo = async () => {
    const parsed = youtubeUrlSchema.safeParse(videoUrl);
    if (!parsed.success) {
      setVideoError(parsed.error.issues[0]?.message ?? 'כתובת לא תקינה');
      return;
    }
    setVideoError('');
    if (lessonId) {
      await addAsset({
        lessonId,
        input: { assetType: 'VIDEO', sourceUrl: videoUrl },
      });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">הוספת חומרים</h2>
      <p className="text-sm text-gray-500 mb-6">
        ניתן לדלג על שלב זה ולהוסיף חומרים לאחר יצירת השיעור
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            🎥 קישור YouTube
          </label>
          <div className="flex gap-2">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
            {lessonId && (
              <Button size="sm" variant="outline" onClick={handleAddVideo}>
                הוסף
              </Button>
            )}
          </div>
          {videoError && (
            <p className="text-red-500 text-xs mt-1">{videoError}</p>
          )}
          {!lessonId && (
            <p className="text-xs text-gray-400 mt-1">
              הקישור יתווסף לאחר יצירת השיעור
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            📄 קובץ הערות (PDF)
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            תמיכה בקבצי PDF, Word, TXT
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1" onClick={onNext}>
          דלג
        </Button>
        <Button className="flex-1" onClick={onNext}>
          המשך לבחירת תבנית ←
        </Button>
      </div>
    </div>
  );
}
