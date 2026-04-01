import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/** Simplified TrialBanner for Storybook (no urql dependency) */
function TrialBannerPreview({
  daysRemaining,
  isTrialing,
}: {
  daysRemaining: number;
  isTrialing: boolean;
}) {
  if (!isTrialing) return null;
  const urgency =
    daysRemaining <= 3
      ? 'bg-destructive text-destructive-foreground'
      : 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100';
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 text-sm ${urgency}`}
    >
      <span>{daysRemaining} days remaining in your trial</span>
      <button className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
        Upgrade Now
      </button>
    </div>
  );
}

const meta: Meta<typeof TrialBannerPreview> = {
  title: 'Onboarding/TrialBanner',
  component: TrialBannerPreview,
};
export default meta;

type Story = StoryObj<typeof TrialBannerPreview>;

export const PlentyOfTime: Story = {
  args: { daysRemaining: 14, isTrialing: true },
};

export const WeekLeft: Story = {
  args: { daysRemaining: 7, isTrialing: true },
};

export const Urgent: Story = {
  args: { daysRemaining: 2, isTrialing: true },
};

export const LastDay: Story = {
  args: { daysRemaining: 1, isTrialing: true },
};

export const NotTrialing: Story = {
  args: { daysRemaining: 0, isTrialing: false },
};
