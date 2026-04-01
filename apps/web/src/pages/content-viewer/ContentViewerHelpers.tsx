/** Shared small UI helpers used across the ContentViewer page. */
import React from 'react';
import { AlertCircle } from 'lucide-react';

export const SkeletonLine = React.memo(function SkeletonLine({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`bg-muted animate-pulse rounded ${className}`}
      aria-hidden="true"
    />
  );
});

export const ErrorBanner = React.memo(function ErrorBanner({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-md dark:text-red-200 dark:bg-red-950 dark:border-red-700">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message} — showing cached data.
    </div>
  );
});
