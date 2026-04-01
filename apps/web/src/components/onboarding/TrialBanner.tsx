/**
 * TrialBanner — Countdown banner showing trial days remaining.
 * Shows at the top of the page for orgs on trial plans.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { Button } from '@/components/ui/button';

const TRIAL_STATUS_QUERY = `
  query TrialStatus {
    trialStatus {
      isTrialing
      daysRemaining
      trialEndsAt
      upgradeUrl
    }
  }
`;

interface TrialData {
  isTrialing: boolean;
  daysRemaining: number;
  trialEndsAt: string;
  upgradeUrl: string;
}

function getBannerStyle(daysRemaining: number): string {
  if (daysRemaining <= 3) return 'bg-red-600 text-white';
  if (daysRemaining <= 7) return 'bg-yellow-500 text-yellow-950';
  return 'bg-blue-600 text-white';
}

export function TrialBanner() {
  const { t } = useTranslation('orgOnboarding');
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data }] = useQuery<{ trialStatus: TrialData }>({
    query: TRIAL_STATUS_QUERY,
    pause: !mounted,
  });

  const trial = data?.trialStatus;
  if (!trial?.isTrialing || dismissed) return null;

  const style = getBannerStyle(trial.daysRemaining);

  return (
    <div
      className={`w-full px-4 py-2 flex items-center justify-center gap-3 text-sm ${style}`}
      data-testid="trial-banner"
      role="alert"
    >
      <span>
        {trial.daysRemaining <= 0
          ? t('trial.expired')
          : t('trial.daysRemaining', { count: trial.daysRemaining })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        className="text-xs"
        onClick={() => {
          window.location.href = trial.upgradeUrl;
        }}
      >
        {t('trial.upgrade')}
      </Button>
      <button
        type="button"
        className="ml-2 opacity-70 hover:opacity-100"
        onClick={() => setDismissed(true)}
        aria-label={t('trial.dismiss')}
      >
        &#x2715;
      </button>
    </div>
  );
}
