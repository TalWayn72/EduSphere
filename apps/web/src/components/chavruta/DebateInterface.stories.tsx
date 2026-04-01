import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { DebateInterface } from './DebateInterface';

const SAMPLE_MESSAGES = [
  {
    id: '1',
    role: 'user' as const,
    content:
      'I believe RLS policies should always be enforced at the database level rather than application level. What do you think?',
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: '2',
    role: 'assistant' as const,
    content:
      'That is a strong position. Database-level RLS provides defense-in-depth since even direct database access is protected. However, there are trade-offs to consider: performance overhead on complex queries, debugging difficulty, and the inability to express business logic that depends on application state.',
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: '3',
    role: 'user' as const,
    content:
      'Good point about performance. But security should never be compromised for speed.',
    createdAt: new Date(Date.now() - 30000).toISOString(),
  },
];

const meta: Meta<typeof DebateInterface> = {
  title: 'Chavruta/DebateInterface',
  component: DebateInterface,
  args: { onSubmit: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-2xl h-[500px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DebateInterface>;

export const Default: Story = {
  args: {
    topic: 'Should RLS be enforced at database level or application level?',
    messages: SAMPLE_MESSAGES,
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    topic: 'The role of AI in education assessment',
    messages: SAMPLE_MESSAGES,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    topic: 'Is GraphQL better than REST for educational platforms?',
    messages: [],
    isLoading: false,
  },
};
