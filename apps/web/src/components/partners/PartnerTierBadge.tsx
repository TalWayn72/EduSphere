/**
 * PartnerTierBadge — displays a colored badge for a partner tier.
 */
import React from 'react';

export type PartnerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
type BadgeSize = 'sm' | 'md' | 'lg';

interface Props {
  tier: PartnerTier;
  size?: BadgeSize;
}

const TIER_CONFIG: Record<PartnerTier, { icon: string; label: string; className: string }> = {
  BRONZE: { icon: '🥉', label: 'Bronze', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  SILVER: { icon: '🥈', label: 'Silver', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  GOLD:   { icon: '🥇', label: 'Gold',   className: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
  PLATINUM: { icon: '💎', label: 'Platinum', className: 'bg-violet-100 text-violet-800 border-violet-300' },
};

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function PartnerTierBadge({ tier, size = 'md' }: Props) {
  const config = TIER_CONFIG[tier];
  return (
    <span
      data-testid="partner-tier-badge"
      data-tier={tier.toLowerCase()}
      className={`inline-flex items-center gap-1 rounded border font-semibold ${config.className} ${SIZE_CLASS[size]}`}
    >
      <span data-testid={`tier-${tier.toLowerCase()}`} aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}
