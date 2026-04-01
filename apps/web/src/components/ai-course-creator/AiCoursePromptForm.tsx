import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, AlertTriangle, RotateCw } from 'lucide-react';
import { ProgressStatus } from '@/components/ProgressStatus';
import { AI_COURSE_GENERATION_MESSAGES } from '@/lib/progress-messages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RequirementLink } from '@/components/RequirementLink';

interface AiCoursePromptFormProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  level: string;
  onLevelChange: (value: string) => void;
  hours: string;
  onHoursChange: (value: string) => void;
  generating: boolean;
  errorMsg: string | null;
  isConsentError: boolean;
  needsConsent: boolean;
  returnTo: string;
  onGenerate: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export function AiCoursePromptForm({
  prompt,
  onPromptChange,
  level,
  onLevelChange,
  hours,
  onHoursChange,
  generating,
  errorMsg,
  isConsentError,
  needsConsent,
  returnTo,
  onGenerate,
  onRetry,
  onClose,
}: AiCoursePromptFormProps) {
  const { t } = useTranslation('courses');
  const { t: tCommon } = useTranslation('common');

  return (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {t('aiCreator.topicLabel')}
        </label>
        <Textarea
          placeholder={t('aiCreator.topicPlaceholder')}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="min-h-[100px]"
          disabled={generating}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {t('aiCreator.audienceLevel')}
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={level}
            onChange={(e) => onLevelChange(e.target.value)}
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
            onChange={(e) => onHoursChange(e.target.value)}
            disabled={generating}
          />
        </div>
      </div>
      {(needsConsent || isConsentError) && (
        <RequirementLink variant="alert" returnTo={returnTo} />
      )}
      {errorMsg && !isConsentError && !needsConsent && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="shrink-0 h-6 px-2 text-destructive hover:text-destructive"
          >
            <RotateCw className="h-3 w-3 mr-1" />
            {tCommon('retry', 'Retry')}
          </Button>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose} disabled={generating}>
          <X className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
          {tCommon('cancel')}
        </Button>
        <Button
          onClick={onGenerate}
          disabled={
            generating || !prompt.trim() || needsConsent || isConsentError
          }
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
  );
}
