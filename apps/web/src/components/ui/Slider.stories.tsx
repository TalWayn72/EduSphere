import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Slider } from './slider';

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  argTypes: {
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-64 p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: { defaultValue: [50] },
};

export const WithStep: Story = {
  args: { defaultValue: [30], step: 10, max: 100 },
};

export const MinMax: Story = {
  args: { defaultValue: [5], min: 0, max: 10, step: 1 },
};

export const Disabled: Story = {
  args: { defaultValue: [40], disabled: true },
};

export const WithLabels: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <div>
        <label className="text-sm font-medium">Volume</label>
        <Slider defaultValue={[70]} />
      </div>
      <div>
        <label className="text-sm font-medium">Brightness</label>
        <Slider defaultValue={[50]} />
      </div>
    </div>
  ),
};
