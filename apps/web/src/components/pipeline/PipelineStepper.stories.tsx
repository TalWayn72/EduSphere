import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PipelineStepper } from './PipelineStepper';

const STEPS = [
  {
    moduleType: 'TRANSCRIPTION' as const,
    status: 'done' as const,
    output: 'Transcribed 45 min video',
  },
  {
    moduleType: 'SUMMARIZATION' as const,
    status: 'done' as const,
    output: 'Generated 3 summaries',
  },
  { moduleType: 'QUIZ_GENERATION' as const, status: 'running' as const },
  { moduleType: 'EMBEDDING' as const, status: 'pending' as const },
  { moduleType: 'KNOWLEDGE_GRAPH' as const, status: 'pending' as const },
];

const meta: Meta<typeof PipelineStepper> = {
  title: 'Pipeline/PipelineStepper',
  component: PipelineStepper,
  args: { onRetry: fn(), onSkip: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PipelineStepper>;

export const InProgress: Story = {
  args: { steps: STEPS },
};

export const AllDone: Story = {
  args: {
    steps: STEPS.map((s) => ({ ...s, status: 'done' as const })),
  },
};

export const WithError: Story = {
  args: {
    steps: [
      { moduleType: 'TRANSCRIPTION' as const, status: 'done' as const },
      {
        moduleType: 'SUMMARIZATION' as const,
        status: 'failed' as const,
        errorMessage: 'Model timeout after 30s',
      },
      { moduleType: 'QUIZ_GENERATION' as const, status: 'pending' as const },
    ],
  },
};

export const AllPending: Story = {
  args: {
    steps: STEPS.map((s) => ({ ...s, status: 'pending' as const })),
  },
};
