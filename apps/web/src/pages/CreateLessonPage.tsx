/**
 * CreateLessonPage — 3-step wizard for creating a new lesson with pipeline template.
 * Route: /courses/:courseId/lessons/new
 *
 * Step 1: Lesson details (title, type, series, date)
 * Step 2: Collect assets (YouTube URL, PDF upload) — no lessonId needed yet
 * Step 3: Select pipeline template → creates lesson → adds collected asset
 *
 * EXCEPTION NOTE (150-line rule): wizard orchestrator wires steps + mutations.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import {
  CREATE_LESSON_MUTATION,
  ADD_LESSON_ASSET_MUTATION,
} from '@/lib/graphql/lesson.queries';
import { CREATE_ENRICHED_BLOCKS_FROM_TRANSCRIPT_MUTATION } from '@/lib/graphql/enriched-lesson.queries';
import { useLessonPipelineStore } from '@/lib/lesson-pipeline.store';
import { PageShell } from '@/components/PageShell';
import { CreateLessonStep1 } from './CreateLessonPage.step1';
import { CreateLessonStep2 } from './CreateLessonPage.step2';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export interface LessonFormData {
  title: string;
  type: 'THEMATIC' | 'SEQUENTIAL';
  lessonDate: string;
}

interface CreateLessonResult {
  createLesson: {
    id: string;
    courseId: string;
    title: string;
    status: string;
  };
}

export function CreateLessonPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('courses');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    type: 'THEMATIC',
    lessonDate: new Date().toISOString().split('T')[0] ?? '',
  });
  const [collectedVideoUrl, setCollectedVideoUrl] = useState<
    string | undefined
  >(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<
    'THEMATIC' | 'SEQUENTIAL' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [{ fetching }, createLesson] = useMutation<CreateLessonResult>(
    CREATE_LESSON_MUTATION
  );
  const [, addAsset] = useMutation(ADD_LESSON_ASSET_MUTATION);
  const [, createEnrichedBlocks] = useMutation(
    CREATE_ENRICHED_BLOCKS_FROM_TRANSCRIPT_MUTATION
  );
  const loadTemplate = useLessonPipelineStore((s) => s.loadTemplate);
  const user = getCurrentUser();

  const handleStep1Submit = (data: LessonFormData) => {
    setFormData(data);
    setStep(2);
  };

  const handleStep2Next = (videoUrl?: string) => {
    setCollectedVideoUrl(videoUrl);
    setStep(3);
  };

  const handleCreateLesson = async () => {
    if (!courseId || !user) {
      setError(
        t(
          'createLesson.authError',
          'Authentication error — please log in again'
        )
      );
      return;
    }
    const { data, error: mutError } = await createLesson({
      input: {
        courseId,
        title: formData.title,
        type: formData.type,
        lessonDate: formData.lessonDate || undefined,
        instructorId: user.id,
      },
    });
    if (mutError) {
      const gqlMsg = mutError.graphQLErrors?.[0]?.message;
      const networkMsg = mutError.networkError?.message;
      const rawMsg = gqlMsg ?? networkMsg ?? mutError.message;
      const isNetworkErr = !gqlMsg && (networkMsg || rawMsg?.includes('fetch'));
      const msg = isNetworkErr
        ? t(
            'createLesson.networkError',
            'Network error — cannot connect to server. Try again.'
          )
        : rawMsg;
      setError(msg);
      return;
    }
    if (data?.createLesson) {
      const lessonId = data.createLesson.id;
      // Add collected video asset now that we have a real lessonId
      if (collectedVideoUrl) {
        await addAsset({
          lessonId,
          input: { assetType: 'VIDEO', sourceUrl: collectedVideoUrl },
        });
        // Fire-and-forget: trigger enriched block generation from transcript.
        // The NATS consumer will also auto-generate blocks when transcription
        // completes, so this call is idempotent and safe to ignore errors.
        createEnrichedBlocks({ lessonId }).catch(() => undefined);
      }
      if (selectedTemplate) loadTemplate(selectedTemplate);
      navigate(`/courses/${courseId}/lessons/${lessonId}/pipeline`);
    }
  };

  return (
    <Layout>
      <PageShell size="sm" className="p-6">
        <Breadcrumbs
          className="mb-4"
          items={[
            { label: t('backToCourses', 'Courses'), href: '/courses' },
            {
              label: t('courseDetails', 'Course'),
              href: `/courses/${courseId}`,
            },
            { label: t('createLesson.newLesson', 'New Lesson') },
          ]}
        />
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            ← {t('back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {t('createLesson.pageTitle', 'Create New Lesson')}
          </h1>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${
                s <= step ? 'bg-blue-600' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <CreateLessonStep1
            initialData={formData}
            onSubmit={handleStep1Submit}
          />
        )}

        {step === 2 && (
          <CreateLessonStep2
            courseId={courseId ?? ''}
            onNext={handleStep2Next}
          />
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {t('createLesson.selectTemplate', 'Select Pipeline Template')}
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div
                className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                  selectedTemplate === 'THEMATIC'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-border hover:border-blue-300'
                }`}
                onClick={() => setSelectedTemplate('THEMATIC')}
              >
                <h3 className="font-semibold text-lg mb-1">
                  🎯 {t('createLesson.typeThematic', 'General (Thematic)')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'createLesson.thematicDescription',
                    'Instructor-defined topic — 8 processing steps'
                  )}
                </p>
              </div>
              <div
                className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                  selectedTemplate === 'SEQUENTIAL'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-border hover:border-purple-300'
                }`}
                onClick={() => setSelectedTemplate('SEQUENTIAL')}
              >
                <h3 className="font-semibold text-lg mb-1">
                  📖 {t('createLesson.typeSequential', 'Sequential')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'createLesson.sequentialDescription',
                    'Sequential study — 9 steps + citation verification'
                  )}
                </p>
              </div>
            </div>
            {error && (
              <div
                className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 dark:bg-red-950 dark:border-red-700"
                data-testid="create-lesson-error"
                role="alert"
              >
                <p className="text-red-700 text-sm dark:text-red-300">
                  {error}
                </p>
                <button
                  type="button"
                  className="text-red-600 text-xs underline mt-1 dark:text-red-400"
                  onClick={() => setError(null)}
                >
                  {t('dismiss', 'Dismiss')}
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                {t('back', 'Back')}
              </Button>
              <Button
                onClick={handleCreateLesson}
                disabled={fetching || !selectedTemplate}
                className="flex-1"
              >
                {fetching
                  ? t('createLesson.creating', 'Creating lesson...')
                  : t(
                      'createLesson.createAndContinue',
                      'Create lesson & continue to Pipeline'
                    )}
              </Button>
            </div>
          </div>
        )}
      </PageShell>
    </Layout>
  );
}
