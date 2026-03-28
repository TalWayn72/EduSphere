import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { CommentCard } from './CommentCard';
import { AnnotationLayer } from '@/types/annotations';

const SAMPLE_ANNOTATION = {
  id: 'ann-001',
  documentId: 'doc-001',
  userId: 'user-001',
  authorName: 'Dr. Sarah Chen',
  layer: AnnotationLayer.INSTRUCTOR,
  content: 'Great insight on knowledge graph traversal patterns. Consider expanding this section with Apache AGE examples.',
  startOffset: 100,
  endOffset: 200,
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  resolved: false,
  replies: [],
};

const meta: Meta<typeof CommentCard> = {
  title: 'Annotation/CommentCard',
  component: CommentCard,
  args: {
    onFocus: fn(),
    onReply: fn(),
    onResolve: fn(),
  },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof CommentCard>;

export const Default: Story = {
  args: {
    annotation: SAMPLE_ANNOTATION,
    isFocused: false,
  },
};

export const Focused: Story = {
  args: {
    annotation: SAMPLE_ANNOTATION,
    isFocused: true,
  },
};

export const PersonalLayer: Story = {
  args: {
    annotation: { ...SAMPLE_ANNOTATION, layer: AnnotationLayer.PERSONAL, authorName: 'You' },
    isFocused: false,
  },
};

export const AIGenerated: Story = {
  args: {
    annotation: {
      ...SAMPLE_ANNOTATION,
      layer: AnnotationLayer.AI_GENERATED,
      authorName: 'AI Assistant',
      content: 'This paragraph could benefit from a concrete example of RLS policy implementation.',
    },
    isFocused: false,
  },
};

export const LongContent: Story = {
  args: {
    annotation: {
      ...SAMPLE_ANNOTATION,
      content: 'This is a very long comment that demonstrates how the component handles text overflow. '.repeat(5),
    },
    isFocused: false,
  },
};
