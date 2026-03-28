import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MasteryBadge } from './MasteryBadge';

const meta: Meta<typeof MasteryBadge> = {
  title: 'UI/MasteryBadge',
  component: MasteryBadge,
  argTypes: {
    level: {
      control: 'select',
      options: ['none', 'attempted', 'familiar', 'proficient', 'mastered'],
    },
    size: { control: 'select', options: ['sm', 'md'] },
    showLabel: { control: 'boolean' },
  },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof MasteryBadge>;

export const Default: Story = {
  args: { level: 'proficient' },
};

export const AllLevels: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <MasteryBadge level="none" />
      <MasteryBadge level="attempted" />
      <MasteryBadge level="familiar" />
      <MasteryBadge level="proficient" />
      <MasteryBadge level="mastered" />
    </div>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <MasteryBadge level="none" size="sm" />
      <MasteryBadge level="attempted" size="sm" />
      <MasteryBadge level="familiar" size="sm" />
      <MasteryBadge level="proficient" size="sm" />
      <MasteryBadge level="mastered" size="sm" />
    </div>
  ),
};

export const NoLabel: Story = {
  args: { level: 'mastered', showLabel: false },
};
