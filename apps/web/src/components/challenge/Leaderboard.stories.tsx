import type { Meta, StoryObj } from '@storybook/react';
import { Leaderboard } from './Leaderboard';

const ENTRIES = [
  {
    id: '1',
    userId: 'u1',
    score: 98,
    rank: 1,
    completedAt: '2026-03-15T10:00:00Z',
  },
  {
    id: '2',
    userId: 'u2',
    score: 92,
    rank: 2,
    completedAt: '2026-03-16T14:30:00Z',
  },
  {
    id: '3',
    userId: 'u3',
    score: 87,
    rank: 3,
    completedAt: '2026-03-17T09:15:00Z',
  },
  {
    id: '4',
    userId: 'u4',
    score: 82,
    rank: 4,
    completedAt: '2026-03-18T16:00:00Z',
  },
  { id: '5', userId: 'u5', score: 75, rank: 5, completedAt: null },
];

const meta: Meta<typeof Leaderboard> = {
  title: 'Challenge/Leaderboard',
  component: Leaderboard,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof Leaderboard>;

export const Default: Story = {
  args: { entries: ENTRIES },
};

export const Empty: Story = {
  args: { entries: [] },
};

export const SingleEntry: Story = {
  args: { entries: [ENTRIES[0]] },
};
