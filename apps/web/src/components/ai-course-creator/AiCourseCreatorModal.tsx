import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAiCourseCreator } from './useAiCourseCreator';
import { AiCoursePromptForm } from './AiCoursePromptForm';
import { AiCourseOutlinePreview } from './AiCourseOutlinePreview';
import type { AiCourseCreatorModalProps } from './types';

export function AiCourseCreatorModal({ open, onClose }: AiCourseCreatorModalProps) {
  const { t } = useTranslation('courses');
  const {
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
  } = useAiCourseCreator(open);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('aiCreator.title')}
          </DialogTitle>
          <DialogDescription>{t('aiCreator.description')}</DialogDescription>
        </DialogHeader>

        {!outline && (
          <AiCoursePromptForm
            prompt={prompt}
            onPromptChange={setPrompt}
            level={level}
            onLevelChange={setLevel}
            hours={hours}
            onHoursChange={setHours}
            generating={generating}
            errorMsg={errorMsg}
            isConsentError={isConsentError}
            needsConsent={needsConsent}
            returnTo={returnTo}
            onGenerate={handleGenerate}
            onRetry={handleRetry}
            onClose={onClose}
          />
        )}

        {outline && (
          <AiCourseOutlinePreview
            outline={outline}
            errorMsg={errorMsg}
            isConsentError={isConsentError}
            needsConsent={needsConsent}
            returnTo={returnTo}
            onRegenerate={() => setOutline(null)}
            onDiscard={onClose}
            onCreateDraft={handleCreateDraft}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
