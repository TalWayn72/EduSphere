import type { Meta, StoryObj } from '@storybook/react';
import { CountdownTimer } from './CountdownTimer';

const meta: Meta<typeof CountdownTimer> = {
  title: 'Challenge/CountdownTimer',
  component: CountdownTimer,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof CountdownTimer>;

export const DaysRemaining: Story = {
  args: { endDate: new Date(Date.now() + 3 * 86400000).toISOString() },
};

export const HoursRemaining: Story = {
  args: { endDate: new Date(Date.now() + 5 * 3600000).toISOString() },
};

export const MinutesRemaining: Story = {
  args: { endDate: new Date(Date.now() + 30 * 60000).toISOString() },
};

export const Expired: Story = {
  args: { endDate: new Date(Date.now() - 86400000).toISOString() },
};
