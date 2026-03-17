import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface OfflineBannerProps {
  onRetry: () => void;
}

export const OfflineBanner = React.memo(function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const { t } = useTranslation('courses');
  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="offline-banner"
      className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-md"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
        <span>{t('networkUnavailable')}</span>
      </div>
      <button
        onClick={onRetry}
        className="underline hover:no-underline text-orange-900 font-medium shrink-0"
        data-testid="offline-banner-retry"
      >
        {t('retry')}
      </button>
    </div>
  );
});
