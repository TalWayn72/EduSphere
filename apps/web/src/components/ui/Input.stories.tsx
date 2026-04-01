import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search'],
    },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Enter text...' },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="name@example.com" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="username">Username</Label>
      <Input id="username" className="border-destructive" defaultValue="ab" />
      <p className="text-sm text-destructive">
        Username must be at least 3 characters.
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled input', disabled: true },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Enter password' },
};
