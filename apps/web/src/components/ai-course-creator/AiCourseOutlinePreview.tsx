import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequirementLink } from '@/components/RequirementLink';
import type { CourseOutline } from './types';

interface AiCourseOutlinePreviewProps {
  outline: CourseOutline;
  errorMsg: string | null;
  isConsentError: boolean;
  needsConsent: boolean;
  returnTo: string;
  onRegenerate: () => void;
  onDiscard: () => void;
  onCreateDraft: () => void;
}

export function AiCourseOutlinePreview({
  outline,
  errorMsg,
  isConsentError,
  needsConsent,
  returnTo,
  onRegenerate,
  onDiscard,
  onCreateDraft,
}: AiCourseOutlinePreviewProps) {
  const { t } = useTranslation('courses');

  return (
    <div className="space-y-5 mt-2">
      <div className="space-y-1">
        <h3 className="font-semibold text-lg">{outline.title}</h3>
        <p className="text-sm text-muted-foreground">{outline.description}</p>
      </div>
      <div className="space-y-3">
        {outline.modules.map((mod, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-2">
            <p className="font-medium text-sm">
              {t('aiCreator.moduleNumber', { n: idx + 1, title: mod.title })}
            </p>
            <p className="text-xs text-muted-foreground">{mod.description}</p>
            <ul className="space-y-1">
              {mod.contentItemTitles.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 dark:text-green-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {(needsConsent || isConsentError) && (
        <RequirementLink variant="alert" returnTo={returnTo} />
      )}
      {errorMsg && !isConsentError && !needsConsent && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          {errorMsg}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onRegenerate}>
          {t('aiCreator.regenerate')}
        </Button>
        <Button variant="outline" onClick={onDiscard}>
          {t('aiCreator.discard')}
        </Button>
        <Button onClick={onCreateDraft}>
          <CheckCircle2 className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
          {t('aiCreator.createDraftCourse')}
        </Button>
      </div>
    </div>
  );
}
