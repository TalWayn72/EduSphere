import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedCounter } from './AnimatedCounter';
import { ReducedMotionProvider } from '@/providers/ReducedMotionProvider';

const meta: Meta<typeof AnimatedCounter> = {
  title: 'Landing/AnimatedCounter',
  component: AnimatedCounter,
  decorators: [
    (Story) => (
      <ReducedMotionProvider>
        <div className="text-4xl font-bold p-8">
          <Story />
        </div>
      </ReducedMotionProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'IntersectionObserver-based count-up counter. Animates from 0 to target when scrolled into view. Immediately shows target value when prefers-reduced-motion is set.',
      },
    },
  },
  argTypes: {
    target: { control: { type: 'number', min: 0 } },
    suffix: { control: 'text' },
    prefix: { control: 'text' },
    duration: { control: { type: 'number', min: 500, max: 5000, step: 100 } },
  },
};

export default meta;
type Story = StoryObj<typeof AnimatedCounter>;

export const Learners: Story = {
  args: {
    target: 500000,
    suffix: '+',
    prefix: '',
    duration: 2000,
  },
};

export const Courses: Story = {
  args: {
    target: 10000,
    suffix: '+',
    prefix: '',
    duration: 1500,
  },
};

export const WithPrefix: Story = {
  args: {
    target: 99,
    prefix: '$',
    suffix: '/mo',
    duration: 1000,
  },
};

export const ShortDuration: Story = {
  args: {
    target: 250,
    suffix: ' teams',
    duration: 800,
  },
};
