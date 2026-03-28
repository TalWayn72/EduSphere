import type { Meta, StoryObj } from '@storybook/react';
import { StreakIndicator } from './StreakIndicator';

const meta: Meta<typeof StreakIndicator> = {
  title: 'Components/StreakIndicator',
  component: StreakIndicator,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof StreakIndicator>;

export const ActiveStreak: Story = {
  args: { currentStreak: 12, longestStreak: 30 },
};

export const NoStreak: Story = {
  args: { currentStreak: 0, longestStreak: 15 },
};

export const NewRecord: Story = {
  args: { currentStreak: 45, longestStreak: 45 },
};

export const JustStarted: Story = {
  args: { currentStreak: 1, longestStreak: 1 },
};
