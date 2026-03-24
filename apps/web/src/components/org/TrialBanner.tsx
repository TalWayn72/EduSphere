/**
 * TrialBanner — Displays trial countdown with urgency levels.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/hooks/useSubscription';

function getUrgency(days: number): string {
  if (days <= 2) return 'critical';
  if (days <= 7) return 'high';
  if (days <= 30) return 'medium';
  return 'low';
}

export function TrialBanner() {
  const { t } = useTranslation('org');
  const { status, daysRemaining } = useSubscription();

  if (status === 'active') return null;

  const isExpired = status === 'past_due' || daysRemaining === 0;
  const urgency = getUrgency(daysRemaining);

  return (
    <div
      role="status"
      aria-live="polite"
      data-urgency={urgency}
      className="flex items-center justify-between rounded-lg border p-3"
    >
      <span className="text-sm font-medium">
        {isExpired
          ? t('orgOnboarding.trialExpired')
          : t('orgOnboarding.trialDaysRemaining', { days: daysRemaining })}
      </span>
      <a
        href="/billing/upgrade"
        role="link"
        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        {t('orgOnboarding.upgrade', 'Upgrade')}
      </a>
    </div>
  );
}
