import type { Meta, StoryObj } from '@storybook/react';
import { OptimizedImage } from './OptimizedImage';

const meta: Meta<typeof OptimizedImage> = {
  title: 'UI/OptimizedImage',
  component: OptimizedImage,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof OptimizedImage>;

export const Default: Story = {
  args: {
    src: 'https://picsum.photos/400/300',
    alt: 'Sample image',
  },
};

export const WithDimensions: Story = {
  args: {
    src: 'https://picsum.photos/200/200',
    alt: 'Square image',
    width: 200,
    height: 200,
    className: 'rounded-lg',
  },
};

export const LazyLoading: Story = {
  args: {
    src: 'https://picsum.photos/600/400',
    alt: 'Lazy loaded image',
    loading: 'lazy',
    width: 600,
    height: 400,
  },
};

export const EagerLoading: Story = {
  args: {
    src: 'https://picsum.photos/400/300',
    alt: 'Eagerly loaded image',
    loading: 'eager',
    width: 400,
    height: 300,
  },
};
