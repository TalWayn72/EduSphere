import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Separator } from './separator';

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    decorative: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64 space-y-2">
      <p className="text-sm">Section A</p>
      <Separator />
      <p className="text-sm">Section B</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center gap-4 h-8">
      <span className="text-sm">Left</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Center</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Right</span>
    </div>
  ),
};

export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <button className="text-sm px-2 py-1 rounded hover:bg-muted">Bold</button>
      <button className="text-sm px-2 py-1 rounded hover:bg-muted">Italic</button>
      <Separator orientation="vertical" className="h-5" />
      <button className="text-sm px-2 py-1 rounded hover:bg-muted">Left</button>
      <button className="text-sm px-2 py-1 rounded hover:bg-muted">Center</button>
      <button className="text-sm px-2 py-1 rounded hover:bg-muted">Right</button>
    </div>
  ),
};
