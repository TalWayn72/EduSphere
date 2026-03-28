import type { Meta, StoryObj } from '@storybook/react';
import { ActivityFeed } from './ActivityFeed';

const ITEMS = [
  {
    id: '1',
    type: 'study' as const,
    title: 'Studied GraphQL Federation',
    description: 'Completed Module 3: Entity Resolution',
    courseTitle: 'Advanced GraphQL',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '2',
    type: 'quiz' as const,
    title: 'Quiz Completed',
    description: 'Scored 92% on Federation Basics',
    courseTitle: 'Advanced GraphQL',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    type: 'annotation' as const,
    title: 'Added Annotation',
    description: 'Highlighted key concept in Lesson 5',
    courseTitle: 'NestJS Patterns',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '4',
    type: 'ai_session' as const,
    title: 'AI Tutoring Session',
    description: 'Discussed RLS policy design with AI tutor',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: '5',
    type: 'discussion' as const,
    title: 'Discussion Post',
    description: 'Replied to "Best practices for pgvector indexes"',
    courseTitle: 'Database Design',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

const meta: Meta<typeof ActivityFeed> = {
  title: 'Components/ActivityFeed',
  component: ActivityFeed,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ActivityFeed>;

export const Default: Story = {
  args: { items: ITEMS },
};

export const SingleItem: Story = {
  args: { items: [ITEMS[0]] },
};

export const Empty: Story = {
  args: { items: [] },
};
