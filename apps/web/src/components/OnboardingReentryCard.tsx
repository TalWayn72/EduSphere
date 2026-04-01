/**
 * OnboardingReentryCard — "Complete Your Profile" card for users who skipped onboarding.
 * Dismissible — stores dismissed state in localStorage.
 */
import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'edusphere_onboarding_reentry_dismissed';

export interface OnboardingReentryCardProps {
  /** Whether the user has skipped onboarding. */
  onboardingSkipped: boolean;
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function OnboardingReentryCard({
  onboardingSkipped,
}: OnboardingReentryCardProps) {
  const { t } = useTranslation('dashboard');
  const [dismissed, setDismissed] = useState(isDismissed);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // localStorage unavailable — dismiss in-memory only
    }
    setDismissed(true);
  }, []);

  if (!onboardingSkipped || dismissed) {
    return null;
  }

  return (
    <Card
      data-testid="onboarding-reentry-card"
      className="border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          {t('reentry.title', 'Complete Your Profile')}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          aria-label={t('reentry.dismiss', 'Dismiss')}
          data-testid="onboarding-reentry-dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          {t(
            'reentry.description',
            'You skipped the onboarding steps. Complete your profile to get the most out of EduSphere.'
          )}
        </p>
        <Button asChild variant="outline">
          <Link to="/onboarding">
            {t('reentry.button', 'Complete Onboarding')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
