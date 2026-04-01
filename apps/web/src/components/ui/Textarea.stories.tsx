import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Textarea } from './textarea';
import { Label } from './label';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  argTypes: {
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: { placeholder: 'Type your message here...' },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="description">Course Description</Label>
      <Textarea id="description" placeholder="Describe your course..." />
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: 'This field is disabled', disabled: true },
};

export const WithDefaultValue: Story = {
  args: {
    defaultValue:
      'This course covers advanced topics in GraphQL Federation including entity resolution, schema composition, and performance optimization.',
  },
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="bio">Bio</Label>
      <Textarea id="bio" className="border-destructive" defaultValue="Hi" />
      <p className="text-sm text-destructive">
        Bio must be at least 20 characters.
      </p>
    </div>
  ),
};
