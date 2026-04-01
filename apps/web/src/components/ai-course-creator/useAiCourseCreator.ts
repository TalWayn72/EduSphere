import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'urql';
import { useNavigate, useLocation } from 'react-router-dom';
import { GENERATE_COURSE_FROM_PROMPT_MUTATION } from '@/lib/graphql/agent-course-gen.queries';
import { CREATE_COURSE_MUTATION } from '@/lib/graphql/content.queries';
import { getCurrentUser } from '@/lib/auth';
import type {
  GenerateCourseResult,
  CreateCourseResult,
  ExecutionOutputData,
  CourseOutline,
} from './types';
import { useExecutionTracking } from './useExecutionTracking';

export function useAiCourseCreator(open: boolean) {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();
  const location = useLocation();

  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState('');
  const [hours, setHours] = useState('');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConsentError, setIsConsentError] = useState(false);
  const [pauseSubscription, setPauseSubscription] = useState(true);

  const needsConsent = useMemo(
    () => localStorage.getItem('edusphere_consent_AI_PROCESSING') !== 'true',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  const returnTo = location.pathname;

  const formatError = useCallback(
    (raw: string): string => {
      if (raw.includes('"code"') && raw.includes('"too_big"')) {
        return t('aiCreator.generationFailed');
      }
      if (raw.includes('timed out')) {
        return t(
          'aiCreator.generationTimeout',
          'Generation timed out. Please try again with a simpler topic.'
        );
      }
      if (raw.includes('LLM service unavailable')) {
        return t(
          'aiCreator.llmUnavailable',
          'AI service is temporarily unavailable. Please try again later.'
        );
      }
      const cleaned = raw.replace(/^outline_generation failed:\s*/i, '');
      if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
        return t('aiCreator.generationFailed');
      }
      return cleaned || t('aiCreator.generationFailed');
    },
    [t]
  );

  const onExecutionResult = useCallback(
    (status: string, output: ExecutionOutputData | null) => {
      setPauseSubscription(true);
      if (status === 'COMPLETED' && output) {
        setGenerating(false);
        setOutline({
          title: output.courseTitle ?? t('aiCreator.untitledCourse'),
          description: output.courseDescription ?? '',
          modules: output.modules ?? [],
        });
      } else if (status === 'FAILED') {
        setGenerating(false);
        const rawError = output?.error ?? '';
        console.error('[AiCourseCreatorModal] Generation failed:', rawError);
        setErrorMsg(formatError(rawError));
      }
    },
    [t, formatError]
  );

  const onExecutionTimeout = useCallback(() => {
    setPauseSubscription(true);
    setGenerating(false);
    console.error(
      '[AiCourseCreatorModal] Hard timeout reached after 5 minutes'
    );
    setErrorMsg(
      t(
        'aiCreator.generationTimeout',
        'Generation timed out. Please try again with a simpler topic.'
      )
    );
  }, [t]);

  const tracking = useExecutionTracking({
    executionId,
    generating,
    pauseSubscription,
    onResult: onExecutionResult,
    onTimeout: onExecutionTimeout,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPauseSubscription(true);
      tracking.clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPrompt('');
      setLevel('');
      setHours('');
      setExecutionId(null);
      setGenerating(false);
      setOutline(null);
      setErrorMsg(null);
      setIsConsentError(false);
      setPauseSubscription(true);
      tracking.resetTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [, generateCourse] = useMutation<GenerateCourseResult>(
    GENERATE_COURSE_FROM_PROMPT_MUTATION
  );
  const [, createCourse] = useMutation<CreateCourseResult>(
    CREATE_COURSE_MUTATION
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setErrorMsg(null);
    setIsConsentError(false);
    setOutline(null);
    tracking.resetTracking();
    const { data, error } = await generateCourse({
      input: {
        prompt: prompt.trim(),
        targetAudienceLevel: level || undefined,
        estimatedHours: hours ? parseInt(hours, 10) : undefined,
      },
    });
    if (error || !data) {
      setGenerating(false);
      const consentErr = error?.graphQLErrors?.find(
        (e) => e.extensions?.code === 'CONSENT_REQUIRED'
      );
      if (consentErr) {
        setIsConsentError(true);
      } else {
        console.error('[AiCourseCreatorModal] Mutation error:', error?.message);
        setErrorMsg(t('aiCreator.generateError'));
      }
      return;
    }
    const { executionId: eid, status } = data.generateCourseFromPrompt;
    setExecutionId(eid);
    if (status === 'COMPLETED') {
      const r = data.generateCourseFromPrompt;
      tracking.markHandled();
      onExecutionResult('COMPLETED', {
        courseTitle: r.courseTitle ?? undefined,
        courseDescription: r.courseDescription ?? undefined,
        modules: r.modules,
      });
    } else {
      setPauseSubscription(false);
    }
  };

  const handleRetry = () => {
    setErrorMsg(null);
    setIsConsentError(false);
    setGenerating(false);
    setExecutionId(null);
    tracking.resetTracking();
  };

  const handleCreateDraft = async () => {
    if (!outline) return;
    const user = getCurrentUser();
    const slug =
      outline.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `ai-course-${Date.now().toString(36)}`;
    const { data, error } = await createCourse({
      input: {
        title: outline.title,
        slug,
        description: outline.description,
        instructorId: user?.id ?? '',
        isPublished: false,
        estimatedHours: hours ? parseInt(hours, 10) : undefined,
      },
    });
    if (error || !data) {
      console.error(
        '[AiCourseCreatorModal] createCourse error:',
        error?.message
      );
      setErrorMsg(t('aiCreator.createDraftError'));
      return;
    }
    navigate('/courses/' + data.createCourse.id, {
      state: {
        message: t('aiCreator.createdAsDraft', {
          title: data.createCourse.title,
        }),
      },
    });
  };

  return {
    prompt,
    setPrompt,
    level,
    setLevel,
    hours,
    setHours,
    generating,
    outline,
    setOutline,
    errorMsg,
    isConsentError,
    needsConsent,
    returnTo,
    handleGenerate,
    handleRetry,
    handleCreateDraft,
  };
}
