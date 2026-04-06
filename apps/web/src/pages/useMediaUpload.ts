import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SAVED_CONFIRMATION_MS } from '@/lib/constants';
import { urqlClient } from '@/lib/urql-client';
import {
  PRESIGNED_UPLOAD_QUERY,
  CONFIRM_MEDIA_UPLOAD_MUTATION,
} from '@/lib/graphql/content.queries';
import { INGEST_YOUTUBE_LESSON_MUTATION } from '@/lib/graphql/enriched-lesson.queries';
import { CREATE_LESSON_MUTATION } from '@/lib/graphql/lesson.queries';
import { getCurrentUser } from '@/lib/auth';
import { DRAFT_COURSE_ID } from './CourseCreatePage.types';
import type { UploadedMedia, CourseFormData } from './course-create.types';

export type UploadState =
  | 'idle'
  | 'presigning'
  | 'uploading'
  | 'confirming'
  | 'done'
  | 'error';

export interface FileUploadEntry {
  file: File;
  title: string;
  state: UploadState;
  progress: number;
  error?: string;
  result?: UploadedMedia;
}

export function useMediaUpload(
  courseId: string,
  mediaList: UploadedMedia[],
  onChange: (updates: Partial<CourseFormData>) => void
) {
  const { t } = useTranslation('courses');
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileUploadEntry[]>([]);
  const [altTextTarget, setAltTextTarget] = useState<{
    mediaId: string;
    altText: string | null;
  } | null>(null);
  const [richDocTitle, setRichDocTitle] = useState('');
  const [richDocContent, setRichDocContent] = useState('');
  const [richDocSaved, setRichDocSaved] = useState(false);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const richDocSavedTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  useEffect(() => {
    return () => {
      if (richDocSavedTimerRef.current) {
        clearTimeout(richDocSavedTimerRef.current);

        if (import.meta.env.DEV)
          console.warn(
            '[CourseWizardMediaStep] cleanup: richDocSaved timer cleared on unmount'
          );
      }
    };
  }, []);

  const updateEntry = (index: number, patch: Partial<FileUploadEntry>) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newEntries: FileUploadEntry[] = files.map((f) => ({
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
      state: 'idle' as const,
      progress: 0,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    e.target.value = '';
  };

  const uploadFile = async (index: number) => {
    const entry = entries[index];
    if (!entry || entry.state !== 'idle') return;

    // Guard: courseId must be a real UUID — backend rejects the "draft" placeholder
    if (!courseId || courseId === DRAFT_COURSE_ID) {
      toast.error(
        'Please complete course details first before uploading files.'
      );
      return;
    }

    updateEntry(index, { state: 'presigning', progress: 0 });
    const contentType = entry.file.type || 'application/octet-stream';

    const presignResult = await urqlClient
      .query(
        PRESIGNED_UPLOAD_QUERY,
        { fileName: entry.file.name, contentType, courseId },
        { requestPolicy: 'network-only' }
      )
      .toPromise();

    if (presignResult.error || !presignResult.data?.getPresignedUploadUrl) {
      const reason =
        presignResult.error?.message ?? 'No presigned URL returned';
      console.error('[CourseWizardMediaStep] presign failed:', reason);
      updateEntry(index, {
        state: 'error',
        error: t('wizard.failedUploadUrl'),
      });
      return;
    }

    const { uploadUrl, fileKey } = presignResult.data.getPresignedUploadUrl as {
      uploadUrl: string;
      fileKey: string;
      expiresAt: string;
    };

    updateEntry(index, { state: 'uploading', progress: 10 });

    try {
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        body: entry.file,
        headers: { 'Content-Type': contentType },
      });
      if (!uploadResp.ok) {
        updateEntry(index, {
          state: 'error',
          error: `Upload failed: ${uploadResp.statusText}`,
        });
        return;
      }
    } catch {
      updateEntry(index, { state: 'error', error: t('wizard.networkError') });
      return;
    }

    updateEntry(index, { state: 'confirming', progress: 80 });

    const confirmResult = await urqlClient
      .mutation(CONFIRM_MEDIA_UPLOAD_MUTATION, {
        fileKey,
        courseId,
        title: entry.title,
      })
      .toPromise();

    if (confirmResult.error || !confirmResult.data?.confirmMediaUpload) {
      updateEntry(index, { state: 'error', error: t('wizard.failedConfirm') });
      return;
    }

    const asset = confirmResult.data.confirmMediaUpload as UploadedMedia;
    updateEntry(index, { state: 'done', progress: 100, result: asset });
    onChange({ mediaList: [...mediaList, asset] });
  };

  const removeEntry = (index: number) => {
    const entry = entries[index];
    if (entry?.result) {
      onChange({
        mediaList: mediaList.filter((m) => m.id !== entry.result?.id),
      });
    }
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const ingestYouTube = async (url: string, videoId: string) => {
    // Guard: courseId must be a real UUID — backend rejects the "draft" placeholder
    if (!courseId || courseId === DRAFT_COURSE_ID) {
      toast.error('Please complete course details first before adding videos.');
      return;
    }

    setYoutubeLoading(true);
    setYoutubeError(null);

    // Step 1: auto-create a draft lesson under the course so we have a lessonId.
    // ingestYoutubeLesson requires lessonId: ID! — no lesson exists yet in wizard flow.
    const instructorId = getCurrentUser()?.id ?? '';
    const lessonResult = await urqlClient
      .mutation(CREATE_LESSON_MUTATION, {
        input: {
          courseId,
          title: 'YouTube Lesson',
          type: 'THEMATIC',
          instructorId,
        },
      })
      .toPromise();

    if (lessonResult.error || !lessonResult.data?.createLesson) {
      const reason =
        lessonResult.error?.message ?? t('wizard.youtubeIngestFailed');
      setYoutubeError(reason);
      setYoutubeLoading(false);
      return;
    }

    const lessonId = (lessonResult.data.createLesson as { id: string }).id;

    // Step 2: ingest the YouTube video against the newly-created lesson.
    const result = await urqlClient
      .mutation(INGEST_YOUTUBE_LESSON_MUTATION, {
        input: { lessonId, youtubeUrl: url },
      })
      .toPromise();

    setYoutubeLoading(false);
    if (result.error || !result.data?.ingestYoutubeLesson) {
      const reason = result.error?.message ?? t('wizard.youtubeIngestFailed');
      setYoutubeError(reason);
      return;
    }

    const { id, youtubeVideoId } = result.data.ingestYoutubeLesson as {
      id: string;
      youtubeVideoId: string;
      enrichmentStatus: string;
    };
    const ytEntry: UploadedMedia = {
      id,
      courseId,
      fileKey: youtubeVideoId,
      title: `YouTube: ${videoId}`,
      contentType: 'YOUTUBE',
      status: 'PROCESSING',
      downloadUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
      altText: null,
    };
    onChange({ mediaList: [...mediaList, ytEntry] });
  };

  const handleSaveRichDoc = () => {
    if (!richDocTitle.trim()) return;
    const richEntry = {
      id: `rich-${Date.now()}`,
      courseId,
      fileKey: '',
      title: richDocTitle.trim(),
      contentType: 'RICH_DOCUMENT',
      status: 'READY' as const,
      downloadUrl: null,
      altText: null,
    } as UploadedMedia;
    onChange({ mediaList: [...mediaList, richEntry] });
    setRichDocSaved(true);
    setRichDocTitle('');
    setRichDocContent('');
    if (richDocSavedTimerRef.current)
      clearTimeout(richDocSavedTimerRef.current);
    richDocSavedTimerRef.current = setTimeout(
      () => setRichDocSaved(false),
      SAVED_CONFIRMATION_MS
    );
  };

  return {
    inputRef,
    entries,
    altTextTarget,
    setAltTextTarget,
    richDocTitle,
    setRichDocTitle,
    richDocContent,
    setRichDocContent,
    richDocSaved,
    handleFileSelect,
    uploadFile,
    removeEntry,
    updateEntry,
    handleSaveRichDoc,
    ingestYouTube,
    youtubeLoading,
    youtubeError,
    t,
    onChange,
    mediaList,
  };
}
