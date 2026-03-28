import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { QuizResultView } from './QuizResultView';

const SAMPLE_QUIZ = {
  id: 'q-1',
  title: 'GraphQL Federation Basics',
  items: [],
  passingScore: 70,
  maxAttempts: 3,
};

const meta: Meta<typeof QuizResultView> = {
  title: 'Quiz/QuizResultView',
  component: QuizResultView,
  args: { onRetry: fn() },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof QuizResultView>;

export const Passed: Story = {
  args: {
    result: {
      score: 90,
      totalQuestions: 10,
      correctAnswers: 9,
      passed: true,
      timeSpent: 420,
      answers: [],
    },
    quiz: SAMPLE_QUIZ,
  },
};

export const Failed: Story = {
  args: {
    result: {
      score: 50,
      totalQuestions: 10,
      correctAnswers: 5,
      passed: false,
      timeSpent: 300,
      answers: [],
    },
    quiz: SAMPLE_QUIZ,
  },
};

export const Perfect: Story = {
  args: {
    result: {
      score: 100,
      totalQuestions: 10,
      correctAnswers: 10,
      passed: true,
      timeSpent: 180,
      answers: [],
    },
    quiz: SAMPLE_QUIZ,
  },
};
