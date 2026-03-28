import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Calendar } from './calendar';

const meta: Meta<typeof Calendar> = {
  title: 'UI/Calendar',
  component: Calendar,
  args: { onSelect: fn() },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof Calendar>;

export const Default: Story = {};

export const WithSelectedDate: Story = {
  args: { selected: new Date(2026, 2, 15) },
};

export const WithMinMax: Story = {
  args: {
    selected: new Date(2026, 2, 15),
    minDate: new Date(2026, 2, 10),
    maxDate: new Date(2026, 2, 25),
  },
};

export const Today: Story = {
  args: { selected: new Date() },
};
