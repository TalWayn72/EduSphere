/**
 * StorageWarningBanner — sticky top-of-page alert when offline storage is full.
 * Rendered by App.tsx (or a layout component) so it appears on all pages.
 * Hidden when storage is healthy or when the Storage API is unsupported.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useStorageManager } from '@/hooks/useStorageManager';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageWarningBanner() {
  const { t } = useTranslation('settings');
  const { stats, isLoading, clearLocalStorage } = useStorageManager();

  if (isLoading || !stats || stats.isUnsupported || !stats.isApproachingLimit) {
    return null;
  }

  const usagePercent = Math.round(stats.usageRatio * 100);
  const variant = stats.isOverLimit ? 'destructive' : 'default';

  return (
    <Alert variant={variant} className="rounded-none border-x-0 border-t-0">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {stats.isOverLimit
            ? t('storage.overLimitWarning')
            : t('storage.approachingLimitWarning')}{' '}
          <span className="font-medium tabular-nums">
            {formatBytes(stats.eduSphereUsedBytes)} /{' '}
            {formatBytes(stats.eduSphereQuotaBytes)} ({usagePercent}%)
          </span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearLocalStorage()}
          className="shrink-0"
        >
          {t('storage.clearCache')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
