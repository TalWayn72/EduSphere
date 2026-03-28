import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CatExamTimer } from './CatExamTimer';

const meta: Meta<typeof CatExamTimer> = {
  title: 'Exam/CatExamTimer',
  component: CatExamTimer,
  args: { onExpired: fn() },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof CatExamTimer>;

export const Default: Story = {
  args: { totalSeconds: 3600 },
};

export const FiveMinutes: Story = {
  args: { totalSeconds: 300 },
};

export const OneMinute: Story = {
  args: { totalSeconds: 60 },
};

export const TenSeconds: Story = {
  args: { totalSeconds: 10 },
};
