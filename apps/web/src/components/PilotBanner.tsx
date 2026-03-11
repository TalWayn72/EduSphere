/**
 * PilotBanner — Dashboard banner shown to users on a PILOT plan.
 * Pulses when fewer than 14 days remain.
 */
import React from 'react';
import { Link } from 'react-router-dom';

interface PilotBannerProps {
  daysRemaining: number;
}

export function PilotBanner({ daysRemaining }: PilotBannerProps) {
  const urgent = daysRemaining < 14;

  return (
    <div
      data-testid="pilot-banner"
      className={`flex items-center justify-between gap-4 rounded-lg bg-indigo-600 px-4 py-3 text-white text-sm${urgent ? ' animate-pulse' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span>
        🚀 <strong>Pilot Mode</strong> — {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining. Upgrade to continue →
      </span>
      <Link
        to="/pricing"
        className="shrink-0 rounded bg-white px-3 py-1 text-indigo-700 font-semibold text-xs hover:bg-indigo-50 transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}
