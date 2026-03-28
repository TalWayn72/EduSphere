import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Label } from './label';
import { Input } from './input';
import { Checkbox } from './checkbox';

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
};
export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: { children: 'Email address' },
};

export const WithInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="course-name">Course Name</Label>
      <Input id="course-name" placeholder="Introduction to..." />
    </div>
  ),
};

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="publish" />
      <Label htmlFor="publish">Publish immediately</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="disabled-input" className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Disabled Field
      </Label>
      <Input id="disabled-input" disabled placeholder="Cannot edit" className="peer" />
    </div>
  ),
};
