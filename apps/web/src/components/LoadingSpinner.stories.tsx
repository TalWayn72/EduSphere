import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;

type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm', containerHeight: 'h-32' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const WithMessages: Story = {
  args: {
    messages: ['Loading course data...', 'Fetching quiz results...', 'Almost ready...'],
  },
};

export const CustomLabel: Story = {
  args: { label: 'Generating embeddings...', size: 'lg' },
};

export const FullScreen: Story = {
  args: { size: 'lg', containerHeight: 'h-screen' },
};
