import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useSubscription, useQuery } from 'urql';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ProgressStatus } from '@/components/ProgressStatus';
import { AI_COURSE_GENERATION_MESSAGES } from '@/lib/progress-messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  GENERATE_COURSE_FROM_PROMPT_MUTATION,
  EXECUTION_STATUS_SUBSCRIPTION,
  AGENT_EXECUTION_QUERY,
} from '@/lib/graphql/agent-course-gen.queries';
import { CREATE_COURSE_MUTATION } from '@/lib/graphql/content.queries';
import { RequirementLink } from '@/components/RequirementLink';
import { getCurrentUser } from '@/lib/auth';

interface GeneratedModule {
  title: string;
  description: string;
  contentItemTitles: string[];
}
interface GenerateCourseResult {
  generateCourseFromPrompt: {
    executionId: string;
    status: string;
    courseTitle: string | null;
    courseDescription: string | null;
    modules: GeneratedModule[];
  };
}
interface ExecutionOutputData {
  courseTitle?: string;
  courseDescription?: string;
  modules?: GeneratedModule[];
  error?: string;
}
interface ExecutionStatusPayload {
  executionStatusChanged: {
    id: string;
    status: string;
    output: ExecutionOutputData | null;
  };
}
interface AgentExecutionResult {
  agentExecution: {
    id: string;
    status: string;
    output: ExecutionOutputData | null;
  } | null;
}
interface CreateCourseResult {
  createCourse: { id: string; title: string };
}
export interface AiCourseCreatorModalProps {
  open: boolean;
  onClose: () => void;
}

/** BUG-095: Polling interval — fallback when WebSocket subscription dies. */
const POLL_INTERVAL_MS = 5000;

export function AiCourseCreatorModal({
  open,
  onClose,
}: AiCourseCreatorModalProps) {
  const { t } = useTranslation('courses');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState('');
  const [hours, setHours] = useState('');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [outline, setOutline] = useState<{
    title: string;
    description: string;
    modules: GeneratedModule[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConsentError, setIsConsentError] = useState(false);
  const [pauseSubscription, setPauseSubscription] = useState(true);
  // BUG-095: Track whether result was already handled (subscription or poll)
  const resultHandledRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const needsConsent = useMemo(
    () => localStorage.getItem('edusphere_consent_AI_PROCESSING') !== 'true',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      setPauseSubscription(true);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // ── Reset state when modal closes ───────────────────────────────────────────
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
      resultHandledRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [open]);

  const [, generateCourse] = useMutation<GenerateCourseResult>(
    GENERATE_COURSE_FROM_PROMPT_MUTATION
  );
  const [, createCourse] = useMutation<CreateCourseResult>(
    CREATE_COURSE_MUTATION
  );

  // ── Subscription (fast path) ────────────────────────────────────────────────
  const [{ data: subData }] = useSubscription<ExecutionStatusPayload>({
    query: EXECUTION_STATUS_SUBSCRIPTION,
    variables: { executionId },
    pause: pauseSubscription,
  });

  // ── Polling query (fallback path — BUG-095) ────────────────────────────────
  // Paused by default; activated only when generating with an executionId.
  const [pollResult, executePoll] = useQuery<AgentExecutionResult>({
    query: AGENT_EXECUTION_QUERY,
    variables: { id: executionId ?? '' },
    pause: true,
  });

  /** Process a completed/failed execution result from either sub or poll. */
  const handleExecutionResult = useCallback(
    (status: string, output: ExecutionOutputData | null) => {
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;
      setPauseSubscription(true);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (status === 'COMPLETED' && output) {
        setGenerating(false);
        setOutline({
          title: output.courseTitle ?? t('aiCreator.untitledCourse'),
          description: output.courseDescription ?? '',
          modules: output.modules ?? [],
        });
      } else if (status === 'FAILED') {
        setGenerating(false);
        setErrorMsg(output?.error ?? t('aiCreator.generationFailed'));
      }
    },
    [t],
  );

  // ── Handle subscription data ───────────────────────────────────────────────
  useEffect(() => {
    if (!subData) return;
    const exec = subData.executionStatusChanged;
    if (exec.status === 'COMPLETED' || exec.status === 'FAILED') {
      handleExecutionResult(exec.status, exec.output);
    }
  }, [subData, handleExecutionResult]);

  // ── BUG-095: Start polling fallback after mutation succeeds ─────────────────
  // Polls every POLL_INTERVAL_MS. Subscription is the fast path; if it delivers
  // the result first, polling stops. If the subscription dies (gateway SSE
  // timeout ~60s), polling continues until completion/failure/15-min timeout.
  useEffect(() => {
    if (!generating || !executionId || resultHandledRef.current) return;

    // Start polling after a short initial delay (give subscription a chance)
    const startDelay = setTimeout(() => {
      if (resultHandledRef.current) return;
      pollTimerRef.current = setInterval(() => {
        if (resultHandledRef.current) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }
        executePoll({ requestPolicy: 'network-only' });
      }, POLL_INTERVAL_MS);
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(startDelay);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [generating, executionId, executePoll]);

  // ── Handle poll results ────────────────────────────────────────────────────
  useEffect(() => {
    if (!pollResult.data?.agentExecution || resultHandledRef.current) return;
    const exec = pollResult.data.agentExecution;
    if (exec.status === 'COMPLETED' || exec.status === 'FAILED') {
      handleExecutionResult(exec.status, exec.output);
    }
  }, [pollResult.data, handleExecutionResult]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setErrorMsg(null);
    setIsConsentError(false);
    setOutline(null);
    resultHandledRef.current = false;
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
        setErrorMsg(t('aiCreator.generateError'));
      }
      return;
    }
    const { executionId: eid, status } = data.generateCourseFromPrompt;
    setExecutionId(eid);
    if (status === 'COMPLETED') {
      const r = data.generateCourseFromPrompt;
      handleExecutionResult('COMPLETED', {
        courseTitle: r.courseTitle ?? undefined,
        courseDescription: r.courseDescription ?? undefined,
        modules: r.modules,
      });
    } else {
      setPauseSubscription(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!outline) return;
    const user = getCurrentUser();
    const slug = outline.title
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
      setErrorMsg(t('aiCreator.createDraftError'));
      return;
    }
    onClose();
    navigate('/courses/' + data.createCourse.id, {
      state: { message: t('aiCreator.createdAsDraft', { title: data.createCourse.title }) },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('aiCreator.title')}
          </DialogTitle>
          <DialogDescription>
            {t('aiCreator.description')}
          </DialogDescription>
        </DialogHeader>

        {!outline && (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t('aiCreator.topicLabel')}
              </label>
              <Textarea
                placeholder={t('aiCreator.topicPlaceholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
                disabled={generating}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('aiCreator.audienceLevel')}</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  disabled={generating}
                >
                  <option value="">{t('aiCreator.anyLevel')}</option>
                  <option value="beginner">{t('aiCreator.beginner')}</option>
                  <option value="intermediate">{t('aiCreator.intermediate')}</option>
                  <option value="advanced">{t('aiCreator.advanced')}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('estimatedHours')}</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t('aiCreator.estimatedHoursPlaceholder')}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  disabled={generating}
                />
              </div>
            </div>
            {(needsConsent || isConsentError) && <RequirementLink variant="alert" returnTo="/courses/new" />}
            {errorMsg && !isConsentError && !needsConsent && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose} disabled={generating}>
                <X className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                {tCommon('cancel')}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim() || needsConsent || isConsentError}
              >
                {generating ? (
                  <ProgressStatus
                    messages={AI_COURSE_GENERATION_MESSAGES}
                    active={generating}
                    variant="inline"
                    interval={3000}
                  />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                    {t('aiCreator.generateCourse')}
                  </>
                )}
              </Button>
            </div>
            {generating && (
              <ProgressStatus
                messages={AI_COURSE_GENERATION_MESSAGES}
                active={generating}
                variant="block"
                interval={3000}
                className="mt-4"
              />
            )}
          </div>
        )}

        {outline && (
          <div className="space-y-5 mt-2">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{outline.title}</h3>
              <p className="text-sm text-muted-foreground">
                {outline.description}
              </p>
            </div>
            <div className="space-y-3">
              {outline.modules.map((mod, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium text-sm">
                    {t('aiCreator.moduleNumber', { n: idx + 1, title: mod.title })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mod.description}
                  </p>
                  <ul className="space-y-1">
                    {mod.contentItemTitles.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {(needsConsent || isConsentError) && <RequirementLink variant="alert" returnTo="/courses/new" />}
            {errorMsg && !isConsentError && !needsConsent && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setOutline(null)}>
                {t('aiCreator.regenerate')}
              </Button>
              <Button variant="outline" onClick={onClose}>
                {t('aiCreator.discard')}
              </Button>
              <Button onClick={handleCreateDraft}>
                <CheckCircle2 className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                {t('aiCreator.createDraftCourse')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
