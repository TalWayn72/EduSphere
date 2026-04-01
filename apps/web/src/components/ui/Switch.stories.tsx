import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { Switch } from './switch';
import { Label } from './label';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  args: { onCheckedChange: fn() },
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { checked: true, disabled: true },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="notifications" />
      <Label htmlFor="notifications">Enable notifications</Label>
    </div>
  ),
};

export const SettingsGroup: Story = {
  render: () => (
    <div className="space-y-4 w-72">
      {[
        'Dark mode',
        'Email notifications',
        'Push notifications',
        'Auto-save',
      ].map((label) => (
        <div key={label} className="flex items-center justify-between">
          <Label>{label}</Label>
          <Switch />
        </div>
      ))}
    </div>
  ),
};
