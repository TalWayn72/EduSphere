import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { AnnotationTimeline } from './AnnotationTimeline';

const SAMPLE_ANNOTATIONS = [
  { id: '1', timestamp: 15, text: 'Introduction', color: '#8b5cf6', layer: 'personal' as const },
  { id: '2', timestamp: 45, text: 'Key concept', color: '#3b82f6', layer: 'shared' as const },
  { id: '3', timestamp: 120, text: 'Example code', color: '#22c55e', layer: 'instructor' as const },
  { id: '4', timestamp: 200, text: 'Summary', color: '#f97316', layer: 'ai' as const },
];

const meta: Meta<typeof AnnotationTimeline> = {
  title: 'Annotation/AnnotationTimeline',
  component: AnnotationTimeline,
  args: { onSeek: fn() },
  decorators: [
    (Story) => (
      <div className="w-[600px] p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AnnotationTimeline>;

export const Default: Story = {
  args: {
    annotations: SAMPLE_ANNOTATIONS,
    currentTime: 60,
    duration: 300,
  },
};

export const AtStart: Story = {
  args: {
    annotations: SAMPLE_ANNOTATIONS,
    currentTime: 0,
    duration: 300,
  },
};

export const NearEnd: Story = {
  args: {
    annotations: SAMPLE_ANNOTATIONS,
    currentTime: 280,
    duration: 300,
  },
};

export const NoAnnotations: Story = {
  args: {
    annotations: [],
    currentTime: 30,
    duration: 300,
  },
};
