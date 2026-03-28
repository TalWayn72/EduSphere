import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';

const SINGLE_CHOICE_ITEM = {
  id: 'mc-1',
  type: 'MULTIPLE_CHOICE' as const,
  stem: 'Which protocol does GraphQL Federation use for inter-service communication?',
  options: [
    { id: 'a', text: 'REST' },
    { id: 'b', text: 'gRPC' },
    { id: 'c', text: 'HTTP with query planning' },
    { id: 'd', text: 'WebSocket only' },
  ],
  correctOptionIds: ['c'],
};

const MULTI_CHOICE_ITEM = {
  ...SINGLE_CHOICE_ITEM,
  stem: 'Which of the following are valid GraphQL directives? (Select all that apply)',
  options: [
    { id: 'a', text: '@deprecated' },
    { id: 'b', text: '@key' },
    { id: 'c', text: '@external' },
    { id: 'd', text: '@synchronized' },
  ],
  correctOptionIds: ['a', 'b', 'c'],
};

const meta: Meta<typeof MultipleChoiceQuestion> = {
  title: 'Quiz/MultipleChoiceQuestion',
  component: MultipleChoiceQuestion,
  args: { onChange: fn() },
};
export default meta;

type Story = StoryObj<typeof MultipleChoiceQuestion>;

export const SingleChoice: Story = {
  args: { item: SINGLE_CHOICE_ITEM, value: [] },
};

export const SingleChoiceSelected: Story = {
  args: { item: SINGLE_CHOICE_ITEM, value: ['c'] },
};

export const MultipleChoice: Story = {
  args: { item: MULTI_CHOICE_ITEM, value: [] },
};

export const MultipleChoiceSelected: Story = {
  args: { item: MULTI_CHOICE_ITEM, value: ['a', 'b'] },
};

export const Disabled: Story = {
  args: { item: SINGLE_CHOICE_ITEM, value: ['c'], disabled: true },
};
