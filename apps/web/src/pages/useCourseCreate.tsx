import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'urql';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';
import { CREATE_COURSE_MUTATION } from '@/lib/graphql/content.queries';
import {
  DEFAULT_FORM,
  type CourseFormData,
  type Difficulty,
} from './course-create.types';
import {
  courseSchema,
  DRAFT_COURSE_ID,
  type CourseSchemaValues,
  type CreateCourseResult,
  type CreateCourseVariables,
  type ExportScormResult,
  type ExportScormVariables,
  EXPORT_SCORM_MUTATION,
} from './CourseCreatePage.types';

export function useCourseCreate() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [step, setStep] = useState(0);
  const [wizardData, setWizardData] = useState<CourseFormData>(DEFAULT_FORM);
  const [showAiModal, setShowAiModal] = useState(false);

  const form = useForm<CourseSchemaValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      difficulty: 'BEGINNER',
      duration: '',
      thumbnail: '\u{1F4DA}',
    },
    mode: 'onTouched',
  });

  const [createResult, executeMutation] = useMutation<
    CreateCourseResult,
    CreateCourseVariables
  >(CREATE_COURSE_MUTATION);

  const [exportScormResult, executeExportScorm] = useMutation<
    ExportScormResult,
    ExportScormVariables
  >(EXPORT_SCORM_MUTATION);

  const isSubmitting = createResult.fetching;
  const isExporting = exportScormResult.fetching;

  const handleExportScorm = async () => {
    const courseId = form.getValues('title')
      ? DRAFT_COURSE_ID
      : DRAFT_COURSE_ID;
    const { data, error } = await executeExportScorm({ courseId });
    if (error) {
      console.error('[CourseCreatePage] SCORM export failed:', error.message);
      toast.error('Failed to export SCORM package. Please try again.');
      return;
    }
    if (data?.exportCourseAsScorm2004) {
      const { downloadUrl, expiresAt } = data.exportCourseAsScorm2004;
      const expiry = new Date(expiresAt).toLocaleTimeString();
      toast.success(
        `SCORM 2004 package ready \u2014 link expires at ${expiry}`,
        {
          description: (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-indigo-400 dark:text-indigo-300"
            >
              Download SCORM package
            </a>
          ),
          duration: 15000,
        }
      );
    }
  };

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
    const rawSlug = vals.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = rawSlug || `course-${Date.now().toString(36)}`;
    const instructorId = user?.id ?? '';

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
      toast.error('Failed to create course. Please try again.');
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

  const [
    watchedTitle,
    watchedDescription,
    watchedDifficulty,
    watchedThumbnail,
  ] = form.watch(['title', 'description', 'difficulty', 'thumbnail']);

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

  return {
    step,
    setStep,
    form,
    wizardData,
    currentData,
    updateWizard,
    showAiModal,
    setShowAiModal,
    isSubmitting,
    isExporting,
    handleExportScorm,
    handleNextFromStep1,
    handlePublish,
    canAdvanceStep1,
    navigate,
  };
}
