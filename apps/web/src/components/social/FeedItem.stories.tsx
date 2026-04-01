import type { Meta, StoryObj } from '@storybook/react';
import FeedItem from './FeedItem';

const SAMPLE_ITEM = {
  id: 'feed-001',
  actorId: 'u-1',
  actorDisplayName: 'Alice Johnson',
  verb: 'COMPLETED' as const,
  objectType: 'course',
  objectId: 'c-1',
  objectTitle: 'Advanced GraphQL Federation',
  createdAt: new Date(Date.now() - 7200000).toISOString(),
};

const meta: Meta<typeof FeedItem> = {
  title: 'Social/FeedItem',
  component: FeedItem,
};
export default meta;

type Story = StoryObj<typeof FeedItem>;

export const Completed: Story = {
  args: { item: SAMPLE_ITEM },
};

export const Enrolled: Story = {
  args: {
    item: {
      ...SAMPLE_ITEM,
      verb: 'ENROLLED',
      objectTitle: 'React 19 Patterns',
    },
  },
};

export const AchievedBadge: Story = {
  args: {
    item: {
      ...SAMPLE_ITEM,
      verb: 'ACHIEVED_BADGE',
      objectType: 'badge',
      objectTitle: 'Knowledge Graph Expert',
    },
  },
};

export const StartedLearning: Story = {
  args: {
    item: {
      ...SAMPLE_ITEM,
      verb: 'STARTED_LEARNING',
      actorDisplayName: 'Bob Smith',
      objectTitle: 'NestJS Microservices',
    },
  },
};

export const Discussed: Story = {
  args: {
    item: {
      ...SAMPLE_ITEM,
      verb: 'DISCUSSED',
      objectType: 'discussion',
      objectTitle: 'Best practices for RLS policies',
    },
  },
};
