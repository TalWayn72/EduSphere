import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useSubscription } from 'urql';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
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
} from '@/lib/graphql/agent-course-gen.queries';
import { CREATE_COURSE_MUTATION } from '@/lib/graphql/content.queries';

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
interface CreateCourseResult {
  createCourse: { id: string; title: string };
}
export interface AiCourseCreatorModalProps {
  open: boolean;
  onClose: () => void;
}

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
  const [pauseSubscription, setPauseSubscription] = useState(true);

  useEffect(() => {
    return () => {
      setPauseSubscription(true);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setPrompt('');
      setLevel('');
      setHours('');
      setExecutionId(null);
      setGenerating(false);
      setOutline(null);
      setErrorMsg(null);
      setPauseSubscription(true);
    }
  }, [open]);

  const [, generateCourse] = useMutation<GenerateCourseResult>(
    GENERATE_COURSE_FROM_PROMPT_MUTATION
  );
  const [, createCourse] = useMutation<CreateCourseResult>(
    CREATE_COURSE_MUTATION
  );

  const [{ data: subData }] = useSubscription<ExecutionStatusPayload>({
    query: EXECUTION_STATUS_SUBSCRIPTION,
    variables: { executionId },
    pause: pauseSubscription,
  });

  useEffect(() => {
    if (!subData) return;
    const exec = subData.executionStatusChanged;
    if (exec.status === 'COMPLETED' && exec.output) {
      setPauseSubscription(true);
      setGenerating(false);
      setOutline({
        title: exec.output.courseTitle ?? t('aiCreator.untitledCourse'),
        description: exec.output.courseDescription ?? '',
        modules: exec.output.modules ?? [],
      });
    } else if (exec.status === 'FAILED') {
      setPauseSubscription(true);
      setGenerating(false);
      setErrorMsg(exec.output?.error ?? t('aiCreator.generationFailed'));
    }
  }, [subData]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setErrorMsg(null);
    setOutline(null);
    const { data, error } = await generateCourse({
      input: {
        prompt: prompt.trim(),
        targetAudienceLevel: level || undefined,
        estimatedHours: hours ? parseInt(hours, 10) : undefined,
      },
    });
    if (error || !data) {
      setGenerating(false);
      // Check for CONSENT_REQUIRED from SI-10 LLM consent guard
      const consentErr = error?.graphQLErrors?.find(
        (e) => e.extensions?.code === 'CONSENT_REQUIRED'
      );
      if (consentErr) {
        setErrorMsg(t('aiCreator.consentRequired'));
      } else {
        // Map all other server/network errors to a user-friendly message.
        // Never expose raw GraphQL messages (e.g. "Cannot return null for
        // non-nullable field") — these are internal implementation details.
        setErrorMsg(t('aiCreator.generateError'));
      }
      return;
    }
    const { executionId: eid, status } = data.generateCourseFromPrompt;
    setExecutionId(eid);
    if (status === 'COMPLETED') {
      const r = data.generateCourseFromPrompt;
      setGenerating(false);
      setOutline({
        title: r.courseTitle ?? t('aiCreator.untitledCourse'),
        description: r.courseDescription ?? '',
        modules: r.modules,
      });
    } else {
      setPauseSubscription(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!outline) return;
    const { data, error } = await createCourse({
      input: {
        title: outline.title,
        description: outline.description,
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
            {errorMsg && (
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
                disabled={generating || !prompt.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5 animate-spin" />
                    {t('aiCreator.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                    {t('aiCreator.generateCourse')}
                  </>
                )}
              </Button>
            </div>
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
            {errorMsg && (
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
