/**
 * OnboardingChecklist — Floating widget showing org setup progress.
 * Displays a collapsible checklist of onboarding tasks with completion state.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const ONBOARDING_STATUS_QUERY = `
  query OnboardingStatus {
    onboardingStatus {
      steps { id label completed href }
      completedCount
      totalCount
    }
  }
`;

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  href: string;
}

interface OnboardingData {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
}

export function OnboardingChecklist() {
  const { t } = useTranslation('orgOnboarding');
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data }] = useQuery<{ onboardingStatus: OnboardingData }>({
    query: ONBOARDING_STATUS_QUERY,
    pause: !mounted,
  });

  const status = data?.onboardingStatus;
  if (!status || dismissed || status.completedCount === status.totalCount) return null;

  const progress = Math.round((status.completedCount / status.totalCount) * 100);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80"
      data-testid="onboarding-checklist"
      role="complementary"
      aria-label={t('checklist.ariaLabel')}
    >
      {open ? (
        <Card className="shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{t('checklist.title')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label={t('checklist.collapse')}>
              &#x2212;
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {t('checklist.progress', { done: status.completedCount, total: status.totalCount })}
              </p>
            </div>
            <ul className="space-y-2" role="list">
              {status.steps.map((step) => (
                <li key={step.id} className="flex items-center gap-2">
                  <span
                    className={`flex items-center justify-center h-5 w-5 rounded-full text-xs border ${
                      step.completed
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-muted-foreground/30'
                    }`}
                    aria-hidden="true"
                  >
                    {step.completed ? '\u2713' : ''}
                  </span>
                  <a
                    href={step.href}
                    className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground hover:underline'}`}
                  >
                    {step.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setDismissed(true)}
            >
              {t('checklist.dismiss')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="shadow-lg"
          aria-label={t('checklist.expand')}
        >
          {t('checklist.title')} ({status.completedCount}/{status.totalCount})
        </Button>
      )}
    </div>
  );
}
