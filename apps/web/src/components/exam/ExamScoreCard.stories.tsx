import type { Meta, StoryObj } from '@storybook/react';
import { ExamScoreCard } from './ExamScoreCard';

const meta: Meta<typeof ExamScoreCard> = {
  title: 'Exam/ExamScoreCard',
  component: ExamScoreCard,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof ExamScoreCard>;

export const Passing: Story = {
  args: {
    result: {
      id: 'r-1',
      examId: 'e-1',
      userId: 'u-1',
      score: 88,
      totalQuestions: 40,
      correctAnswers: 35,
      startedAt: '2026-03-20T10:00:00Z',
      completedAt: '2026-03-20T10:45:00Z',
      confidenceInterval: { lower: 82, upper: 94 },
    },
    scoreDisplay: 88,
    scoreMax: 100,
  },
};

export const Failing: Story = {
  args: {
    result: {
      id: 'r-2',
      examId: 'e-1',
      userId: 'u-1',
      score: 52,
      totalQuestions: 40,
      correctAnswers: 21,
      startedAt: '2026-03-20T10:00:00Z',
      completedAt: '2026-03-20T10:30:00Z',
      confidenceInterval: { lower: 45, upper: 59 },
    },
    scoreDisplay: 52,
    scoreMax: 100,
  },
};

export const Perfect: Story = {
  args: {
    result: {
      id: 'r-3',
      examId: 'e-1',
      userId: 'u-1',
      score: 100,
      totalQuestions: 40,
      correctAnswers: 40,
      startedAt: '2026-03-20T10:00:00Z',
      completedAt: '2026-03-20T10:20:00Z',
      confidenceInterval: null,
    },
    scoreDisplay: 100,
    scoreMax: 100,
  },
};
