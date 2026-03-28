import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChallengeCard } from './ChallengeCard';

const SAMPLE_CHALLENGE = {
  id: 'ch-001',
  title: 'GraphQL Federation Mastery Challenge',
  description: 'Build a federated schema with 3 subgraphs and demonstrate entity resolution.',
  challengeType: 'PROJECT',
  targetScore: 85,
  startDate: new Date(Date.now() - 86400000).toISOString(),
  endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
  maxParticipants: 50,
  participantCount: 32,
  status: 'ACTIVE',
};

const meta: Meta<typeof ChallengeCard> = {
  title: 'Challenge/ChallengeCard',
  component: ChallengeCard,
  args: { onJoin: fn() },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof ChallengeCard>;

export const Default: Story = {
  args: { challenge: SAMPLE_CHALLENGE },
};

export const QuizType: Story = {
  args: {
    challenge: { ...SAMPLE_CHALLENGE, challengeType: 'QUIZ', title: 'Weekly Quiz Sprint' },
  },
};

export const DiscussionType: Story = {
  args: {
    challenge: { ...SAMPLE_CHALLENGE, challengeType: 'DISCUSSION', title: 'Debate: AI in Education' },
  },
};

export const AlmostFull: Story = {
  args: {
    challenge: { ...SAMPLE_CHALLENGE, participantCount: 48, maxParticipants: 50 },
  },
};

export const Joining: Story = {
  args: { challenge: SAMPLE_CHALLENGE, isJoining: true },
};

export const Ended: Story = {
  args: {
    challenge: {
      ...SAMPLE_CHALLENGE,
      status: 'ENDED',
      endDate: new Date(Date.now() - 86400000).toISOString(),
    },
  },
};
