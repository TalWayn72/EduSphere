import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LanguageSelector } from '@/components/LanguageSelector';
import { PrivacyConsentCard } from '@/components/settings/PrivacyConsentCard';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useStorageManager } from '@/hooks/useStorageManager';
import { useSettingsHighlight } from '@/hooks/useSettingsHighlight';
import type { SupportedLocale } from '@edusphere/i18n';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function SettingsPage() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const highlight = useSettingsHighlight();
  const { locale, setLocale, isSaving, availableLocales } =
    useUserPreferences();
  const {
    stats,
    isLoading: storageLoading,
    clearLocalStorage,
  } = useStorageManager();

  const handleLocaleChange = async (
    newLocale: SupportedLocale
  ): Promise<void> => {
    try {
      await setLocale(newLocale);
      toast.success(t('language.saved'));
    } catch {
      toast.error(t('language.error'));
    }
  };

  const handleClearCache = () => {
    const freed = clearLocalStorage();
    toast.success(t('storage.freedBytes', { bytes: formatBytes(freed) }));
  };

  const usagePercent = stats
    ? Math.min(Math.round(stats.usageRatio * 100), 100)
    : 0;
  const barColor = stats?.isOverLimit
    ? 'bg-destructive'
    : stats?.isApproachingLimit
      ? 'bg-yellow-500'
      : 'bg-primary';

  return (
    <Layout>
      <PageShell size="sm">
        <div className="flex items-center gap-3">
          {returnTo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(returnTo)}
              aria-label={t('backToPage')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('language.title')}</CardTitle>
            <CardDescription>{t('language.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector
              value={locale}
              onChange={(l) => void handleLocaleChange(l)}
              disabled={isSaving}
              availableLocales={availableLocales}
            />
            {isSaving && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('language.saving')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Privacy & AI Consent Card */}
        <PrivacyConsentCard highlight={highlight} />

        {/* Offline Storage Card */}
        {!stats?.isUnsupported && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                {t('storage.title')}
              </CardTitle>
              <CardDescription>{t('storage.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats?.isOverLimit && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  {t('storage.overLimitWarning')}
                </div>
              )}
              {!stats?.isOverLimit && stats?.isApproachingLimit && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-200">
                  {t('storage.approachingLimitWarning')}
                </div>
              )}

              {storageLoading ? (
                <div className="h-2 w-full rounded bg-muted animate-pulse" />
              ) : (
                <>
                  <div className="space-y-1">
                    <Progress value={usagePercent} indicatorClassName={barColor} />
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>
                        {formatBytes(stats?.eduSphereUsedBytes ?? 0)}{' '}
                        {t('storage.used')}
                      </span>
                      <span>
                        {t('storage.limitOf')}{' '}
                        {formatBytes(stats?.eduSphereQuotaBytes ?? 0)} (
                        {usagePercent}%)
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    className="w-full"
                  >
                    {t('storage.clearCache')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </PageShell>
    </Layout>
  );
}
