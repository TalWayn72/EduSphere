import type { Meta, StoryObj } from '@storybook/react';
import { MotionCard } from './MotionCard';
import { ReducedMotionProvider } from '@/providers/ReducedMotionProvider';

const meta: Meta<typeof MotionCard> = {
  title: 'Landing/MotionCard',
  component: MotionCard,
  decorators: [
    (Story) => (
      <ReducedMotionProvider>
        <Story />
      </ReducedMotionProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Animated card wrapper using Framer Motion. Fades in from below when entering viewport. Respects prefers-reduced-motion.',
      },
    },
  },
  argTypes: {
    delay: {
      control: { type: 'number', min: 0, max: 2, step: 0.1 },
      description: 'Animation delay in seconds',
    },
    className: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof MotionCard>;

export const Default: Story = {
  args: {
    delay: 0,
    children: (
      <div className="p-6 border rounded-lg w-64">
        <h3 className="font-bold mb-2">Feature Title</h3>
        <p className="text-muted-foreground text-sm">
          Feature description goes here.
        </p>
      </div>
    ),
  },
};

export const WithDelay: Story = {
  args: {
    delay: 0.3,
    children: (
      <div className="p-6 border rounded-lg w-64">
        <h3 className="font-bold mb-2">Delayed Card</h3>
        <p className="text-muted-foreground text-sm">
          This card animates after a 0.3s delay.
        </p>
      </div>
    ),
  },
};

export const MultipleCards: Story = {
  render: () => (
    <ReducedMotionProvider>
      <div className="flex gap-4">
        {[0, 0.15, 0.3].map((delay) => (
          <MotionCard key={delay} delay={delay}>
            <div className="p-6 border rounded-lg w-48">
              <h3 className="font-bold mb-2">Card {delay}s</h3>
              <p className="text-muted-foreground text-sm">Staggered animation.</p>
            </div>
          </MotionCard>
        ))}
      </div>
    </ReducedMotionProvider>
  ),
};
