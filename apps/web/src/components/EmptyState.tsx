import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  /** Optional icon element to display above the title */
  icon?: React.ReactNode;
  /** Title text — defaults to i18n `emptyState.defaultTitle` */
  title?: string;
  /** Description text — defaults to i18n `emptyState.defaultDescription` */
  description?: string;
  /** Optional CTA button label */
  actionLabel?: string;
  /** Callback when the CTA button is clicked */
  onAction?: () => void;
  /** Additional CSS classes for the container */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation('common');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className,
      )}
      data-testid="empty-state"
    >
      {icon && (
        <div className="rounded-full bg-muted p-5" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          {title ?? t('emptyState.defaultTitle')}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {description ?? t('emptyState.defaultDescription')}
        </p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
