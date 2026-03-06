/**
 * OfflineBanner — fixed notification banner shown when the browser is offline.
 *
 * Accessibility: role="status" aria-live="polite" (WCAG 2.1 AA).
 * Renders nothing when online — zero visual impact in normal usage.
 * Memory-safe: no timers; relies on useOfflineStatus event listeners.
 */
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOffline } = useOfflineStatus();
  const { pendingCount } = useOfflineQueue();
  const { t } = useTranslation('offline');

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="offline-banner"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'flex items-center justify-center gap-2',
        'bg-amber-600 text-white text-sm font-medium',
        'px-4 py-2.5',
        'animate-in slide-in-from-bottom-2 duration-300'
      )}
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{t('banner')}</span>
      {pendingCount > 0 && (
        <span
          className="ml-2 bg-white/20 rounded px-2 py-0.5 text-xs"
          aria-label={t('pendingSync', { count: pendingCount })}
        >
          {t('pendingSync', { count: pendingCount })}
        </span>
      )}
    </div>
  );
}
