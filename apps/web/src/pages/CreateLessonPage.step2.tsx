/**
 * CreateLessonStep2 — collect assets (YouTube URL, file) before lesson creation.
 * The lesson does not exist yet at this step, so assets are collected and passed
 * to the parent via onNext(videoUrl) for post-creation upload.
 */
import { useState } from 'react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface Props {
  courseId: string;
  /** Called when user proceeds. Passes the (optional) YouTube URL they entered. */
  onNext: (videoUrl?: string) => void;
}

export function CreateLessonStep2({ courseId: _courseId, onNext }: Props) {
  const { t } = useTranslation('courses');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoError, setVideoError] = useState('');

  const youtubeUrlSchema = z
    .string()
    .url()
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be'),
      t('createLesson.youtubeValidation')
    );

  const validateVideoUrl = (): boolean => {
    if (!videoUrl) return true; // empty is valid (optional field)
    const parsed = youtubeUrlSchema.safeParse(videoUrl);
    if (!parsed.success) {
      setVideoError(
        parsed.error.issues[0]?.message ?? t('createLesson.invalidUrl')
      );
      return false;
    }
    setVideoError('');
    return true;
  };

  const handleContinue = () => {
    if (!validateVideoUrl()) return;
    onNext(videoUrl || undefined);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {t('createLesson.step2Title')}
      </h2>
      <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
        {t('createLesson.step2Hint')}
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('createLesson.youtubeLink')}
          </label>
          <div className="flex gap-2">
            <input
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                if (videoError) setVideoError('');
              }}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>
          {videoError && (
            <p className="text-red-500 text-xs mt-1 dark:text-red-400">
              {videoError}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
            {t('createLesson.linkAddedAfterCreation')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('createLesson.notesFile')}
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">
            {t('createLesson.supportedFormats')}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1" onClick={() => onNext()}>
          {t('createLesson.skip')}
        </Button>
        <Button className="flex-1" onClick={handleContinue}>
          {t('createLesson.continueToTemplate')}
        </Button>
      </div>
    </div>
  );
}
