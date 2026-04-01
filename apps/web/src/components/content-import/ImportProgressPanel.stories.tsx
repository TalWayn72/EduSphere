import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ImportProgressPanel } from './ImportProgressPanel';

const meta: Meta<typeof ImportProgressPanel> = {
  title: 'ContentImport/ImportProgressPanel',
  component: ImportProgressPanel,
  args: { onDone: fn() },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof ImportProgressPanel>;

export const Pending: Story = {
  args: {
    job: {
      id: 'job-1',
      status: 'PENDING',
      lessonCount: 12,
      estimatedMinutes: 5,
    },
  },
};

export const Running: Story = {
  args: {
    job: {
      id: 'job-2',
      status: 'RUNNING',
      lessonCount: 12,
      estimatedMinutes: 3,
    },
  },
};

export const Complete: Story = {
  args: {
    job: {
      id: 'job-3',
      status: 'COMPLETE',
      lessonCount: 12,
      estimatedMinutes: null,
    },
  },
};

export const Failed: Story = {
  args: {
    job: {
      id: 'job-4',
      status: 'FAILED',
      lessonCount: 0,
      estimatedMinutes: null,
    },
  },
};

export const Cancelled: Story = {
  args: {
    job: {
      id: 'job-5',
      status: 'CANCELLED',
      lessonCount: 6,
      estimatedMinutes: null,
    },
  },
};
