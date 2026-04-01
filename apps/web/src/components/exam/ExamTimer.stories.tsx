import type { Meta, StoryObj } from '@storybook/react';
import { ExamTimer } from './ExamTimer';

const meta: Meta<typeof ExamTimer> = {
  title: 'Exam/ExamTimer',
  component: ExamTimer,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof ExamTimer>;

export const Normal: Story = {
  args: {
    formattedTime: '45:30',
    isWarning: false,
    isCritical: false,
    timeRemaining: 2730,
  },
};

export const Warning: Story = {
  args: {
    formattedTime: '04:55',
    isWarning: true,
    isCritical: false,
    timeRemaining: 295,
  },
};

export const Critical: Story = {
  args: {
    formattedTime: '00:45',
    isWarning: true,
    isCritical: true,
    timeRemaining: 45,
  },
};

export const Flashing: Story = {
  args: {
    formattedTime: '00:30',
    isWarning: true,
    isCritical: true,
    timeRemaining: 30,
  },
};
