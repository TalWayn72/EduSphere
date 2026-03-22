/**
 * StepIndicator — Horizontal stepper for the signup wizard.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

const STEPS = ['account', 'organization', 'branding'] as const;

interface StepIndicatorProps {
  current: number;
  total: number;
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  const { t } = useTranslation('orgOnboarding');
  return (
    <nav aria-label={t('wizard.stepsLabel')} className="mb-8">
      <ol className="flex items-center justify-center gap-2">
        {STEPS.map((key, i) => {
          const isActive = i === current;
          const isDone = i < current;
          return (
            <li key={key} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium border-2 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isDone
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isDone ? '\u2713' : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                {t(`wizard.steps.${key}`)}
              </span>
              {i < total - 1 && (
                <div className="w-8 h-px bg-muted-foreground/30 mx-1 hidden sm:block" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
