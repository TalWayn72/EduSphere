import type { Meta, StoryObj } from '@storybook/react';
import { CatProgressIndicator } from './CatProgressIndicator';

const meta: Meta<typeof CatProgressIndicator> = {
  title: 'Exam/CatProgressIndicator',
  component: CatProgressIndicator,
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CatProgressIndicator>;

export const Default: Story = {
  args: { currentItemNumber: 10, minItems: 20, maxItems: 40 },
};

export const AtMinimum: Story = {
  args: { currentItemNumber: 20, minItems: 20, maxItems: 40 },
};

export const NearMax: Story = {
  args: { currentItemNumber: 38, minItems: 20, maxItems: 40 },
};

export const EarlyStage: Story = {
  args: { currentItemNumber: 3, minItems: 20, maxItems: 40 },
};

export const FixedLength: Story = {
  args: { currentItemNumber: 15, minItems: 30, maxItems: 30 },
};
