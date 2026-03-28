import type { Meta, StoryObj } from '@storybook/react';
import { UsageMeter } from './UsageMeter';

const meta: Meta<typeof UsageMeter> = {
  title: 'Admin/UsageMeter',
  component: UsageMeter,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof UsageMeter>;

export const Default: Story = {
  args: { current: 500, limit: 1000, label: 'Active Users' },
};

export const LowUsage: Story = {
  args: { current: 100, limit: 1000, label: 'Storage (GB)' },
};

export const HighUsage: Story = {
  args: { current: 850, limit: 1000, label: 'API Calls' },
};

export const OverLimit: Story = {
  args: { current: 1000, limit: 1000, label: 'Seats Used' },
};

export const ZeroLimit: Story = {
  args: { current: 0, limit: 0, label: 'Unused' },
};
