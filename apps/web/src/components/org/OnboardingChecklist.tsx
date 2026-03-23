/**
 * OnboardingChecklist — Guided org setup steps with progress tracking.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';

export function OnboardingChecklist() {
  const { t } = useTranslation('org');
  const { steps, completedCount, totalCount, isDismissed, dismiss } =
    useOnboardingChecklist();

  if (isDismissed) return null;

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">
          {t('orgOnboarding.checklistTitle', 'Getting Started')}
        </h3>
        <button
          onClick={dismiss}
          aria-label="dismiss"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          {t('common.close', 'Close')}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>

      <ul role="list" className="space-y-1">
        {steps.map((step) => (
          <li
            key={step.id}
            data-step={step.id}
            data-completed={String(step.completed)}
            className="flex items-center gap-2 text-sm"
          >
            <span className={step.completed ? 'text-green-600' : 'text-muted-foreground'}>
              {step.completed ? '\u2713' : '\u25CB'}
            </span>
            <span>{t(step.label)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
