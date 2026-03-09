import type { Meta, StoryObj } from '@storybook/react';
import { TestimonialsCarousel } from './TestimonialsCarousel';
import { ReducedMotionProvider } from '@/providers/ReducedMotionProvider';

const meta: Meta<typeof TestimonialsCarousel> = {
  title: 'Landing/TestimonialsCarousel',
  component: TestimonialsCarousel,
  decorators: [
    (Story) => (
      <ReducedMotionProvider>
        <Story />
      </ReducedMotionProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Auto-rotating testimonials carousel using AnimatePresence. Rotates every 4 seconds. Pauses on hover. Dot navigation for manual control. ARIA live region announces changes.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TestimonialsCarousel>;

export const Default: Story = {};

export const StaticFirstSlide: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shows the carousel in its initial state (first testimonial visible).',
      },
    },
  },
};
