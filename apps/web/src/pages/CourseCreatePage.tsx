import React, { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
// Step 1 is shown immediately — keep eager
import { CourseWizardStep1 } from './CourseWizardStep1';
// Steps 2–4 are lazy: avoids pulling TipTap+KaTeX (~450 KB) on initial page load.
// RichEditor (TipTap StarterKit + 8 extensions + lowlight + KaTeX) lives in
// CourseWizardMediaStep and must NOT be downloaded until the user reaches step 2.
const CourseWizardStep2 = lazy(() =>
  import('./CourseWizardStep2').then((m) => ({ default: m.CourseWizardStep2 }))
);
const CourseWizardMediaStep = lazy(() =>
  import('./CourseWizardMediaStep').then((m) => ({
    default: m.CourseWizardMediaStep,
  }))
);
const CourseWizardStep3 = lazy(() =>
  import('./CourseWizardStep3').then((m) => ({ default: m.CourseWizardStep3 }))
);
import {
  DEFAULT_FORM,
  type CourseFormData,
  type Difficulty,
} from './course-create.types';
import { CREATE_COURSE_MUTATION } from '@/lib/graphql/content.queries';
import { getCurrentUser } from '@/lib/auth';

// ── Zod schema for Step 1 fields ─────────────────────────────────────────────
export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .or(z.literal('')),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.string().optional(),
  thumbnail: z.string().min(1, 'Thumbnail required'),
});

export type CourseSchemaValues = z.infer<typeof courseSchema>;

// ── GraphQL types ─────────────────────────────────────────────────────────────
interface CreateCourseResult {
  createCourse: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    isPublished: boolean;
    estimatedHours: number | null;
    createdAt: string;
  };
}

interface CreateCourseVariables {
  input: {
    title: string;
    slug: string;
    description?: string;
    instructorId: string;
    isPublished: boolean;
    estimatedHours?: number;
  };
}

const DRAFT_COURSE_ID = 'draft';

export function CourseCreatePage() {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const user = getCurrentUser();

  const STEPS = [
    {
      label: t('wizard.step1Label'),
      description: t('wizard.step1Description'),
    },
    {
      label: t('wizard.step2Label'),
      description: t('wizard.step2Description'),
    },
    {
      label: t('wizard.mediaLabel'),
      description: t('wizard.mediaDescription'),
    },
    {
      label: t('wizard.publishLabel'),
      description: t('wizard.publishDescription'),
    },
  ];
  const [step, setStep] = useState(0);
  const [wizardData, setWizardData] = useState<CourseFormData>(DEFAULT_FORM);

  const form = useForm<CourseSchemaValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(courseSchema as any),
    defaultValues: {
      title: '',
      description: '',
      difficulty: 'BEGINNER',
      duration: '',
      thumbnail: '📚',
    },
    mode: 'onTouched',
  });

  const [createResult, executeMutation] = useMutation<
    CreateCourseResult,
    CreateCourseVariables
  >(CREATE_COURSE_MUTATION);

  const isSubmitting = createResult.fetching;

  // Sync RHF values into wizard state for non-RHF steps to read
  const syncWizardData = () => {
    const vals = form.getValues();
    setWizardData((prev) => ({
      ...prev,
      title: vals.title,
      description: vals.description ?? '',
      difficulty: vals.difficulty as Difficulty,
      duration: vals.duration ?? '',
      thumbnail: vals.thumbnail,
    }));
  };

  const handleNextFromStep1 = async () => {
    const valid = await form.trigger(['title', 'description', 'difficulty']);
    if (!valid) return;
    syncWizardData();
    setStep(1);
  };

  const handlePublish = async (publish: boolean) => {
    const vals = form.getValues();
    const slug = vals.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const instructorId = user?.id ?? 'unknown';

    const { data, error } = await executeMutation({
      input: {
        title: vals.title,
        slug,
        description: vals.description || undefined,
        instructorId,
        isPublished: publish,
      },
    });

    if (error) {
      const msg =
        error.graphQLErrors?.[0]?.message ??
        error.message ??
        'Failed to create course';
      toast.error(msg);
      return;
    }

    if (data?.createCourse) {
      const label = publish
        ? `"${data.createCourse.title}" has been published!`
        : `"${data.createCourse.title}" saved as draft.`;
      toast.success(label);
      navigate(`/courses/${data.createCourse.id}`);
    }
  };

  // Single subscription for all watched fields — avoids 5 separate re-render cycles per keystroke.
  const [watchedTitle, watchedDescription, watchedDifficulty, watchedThumbnail] =
    form.watch(['title', 'description', 'difficulty', 'thumbnail']);

  // Merged view of form data for steps 2–4 that display wizard state
  const currentData: CourseFormData = {
    ...wizardData,
    title: watchedTitle || wizardData.title,
    description: watchedDescription || wizardData.description,
    difficulty: (watchedDifficulty as Difficulty) || wizardData.difficulty,
    thumbnail: watchedThumbnail || wizardData.thumbnail,
  };

  const updateWizard = (updates: Partial<CourseFormData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const canAdvanceStep1 = watchedTitle?.trim().length >= 3;
  const lastContentStep = STEPS.length - 2;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/courses')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('title')}
          </Button>
          <h1 className="text-2xl font-bold">{t('createCourse')}</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    i < step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : i === step
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div className="text-center hidden sm:block">
                  <p
                    className={`text-xs font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    i < step ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{STEPS[step]?.label}</h2>
            <p className="text-sm text-muted-foreground">
              {STEPS[step]?.description}
            </p>
          </div>

          <Form {...form}>
            {step === 0 && <CourseWizardStep1 control={form.control} />}
          </Form>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            }
          >
            {step === 1 && (
              <CourseWizardStep2
                modules={wizardData.modules}
                onChange={updateWizard}
              />
            )}
            {step === 2 && (
              <CourseWizardMediaStep
                courseId={DRAFT_COURSE_ID}
                mediaList={wizardData.mediaList}
                onChange={updateWizard}
              />
            )}
            {step === 3 && (
              <CourseWizardStep3
                data={currentData}
                onPublish={handlePublish}
                isSubmitting={isSubmitting}
              />
            )}
          </Suspense>
        </Card>

        {/* Navigation */}
        {step < STEPS.length - 1 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('wizard.back')}
            </Button>
            <Button
              onClick={
                step === 0 ? handleNextFromStep1 : () => setStep((s) => s + 1)
              }
              disabled={step === 0 && !canAdvanceStep1}
            >
              {t('wizard.next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
        {step === STEPS.length - 1 && (
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setStep(lastContentStep)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('wizard.backToMedia')}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
