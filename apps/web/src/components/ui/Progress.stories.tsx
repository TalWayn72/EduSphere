import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Progress } from './progress';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
};
export default meta;

type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 50 },
};

export const Empty: Story = {
  args: { value: 0 },
};

export const Full: Story = {
  args: { value: 100 },
};

export const CustomColor: Story = {
  args: { value: 75, indicatorClassName: 'bg-destructive' },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <div>
        <p className="text-sm mb-1">0% — Not started</p>
        <Progress value={0} />
      </div>
      <div>
        <p className="text-sm mb-1">25% — In progress</p>
        <Progress value={25} />
      </div>
      <div>
        <p className="text-sm mb-1">75% — Almost done</p>
        <Progress value={75} indicatorClassName="bg-yellow-500" />
      </div>
      <div>
        <p className="text-sm mb-1">100% — Complete</p>
        <Progress value={100} indicatorClassName="bg-green-500" />
      </div>
    </div>
  ),
};
