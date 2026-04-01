import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FillBlankQuestion } from './FillBlankQuestion';
import type { FillBlank } from '@/types/quiz';

const blankItem: FillBlank = {
  type: 'FILL_BLANK',
  question:
    'The capital of France is {{blank}} and it is known as the City of Light.',
  correctAnswer: 'Paris',
  useSemanticMatching: false,
  similarityThreshold: 0.8,
};

const noBlankItem: FillBlank = {
  type: 'FILL_BLANK',
  question: 'What is the largest planet in our solar system?',
  correctAnswer: 'Jupiter',
  useSemanticMatching: false,
  similarityThreshold: 0.8,
};

const semanticItem: FillBlank = {
  type: 'FILL_BLANK',
  question: 'Explain the concept of {{blank}} in quantum mechanics.',
  correctAnswer: 'superposition',
  useSemanticMatching: true,
  similarityThreshold: 0.75,
};

function Wrapper({ item, disabled }: { item: FillBlank; disabled?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <FillBlankQuestion
      item={item}
      value={value}
      onChange={setValue}
      disabled={disabled}
    />
  );
}

const meta: Meta<typeof FillBlankQuestion> = {
  title: 'Quiz/FillBlankQuestion',
  component: FillBlankQuestion,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof FillBlankQuestion>;

export const WithBlank: Story = {
  render: () => <Wrapper item={blankItem} />,
};

export const WithoutBlank: Story = {
  render: () => <Wrapper item={noBlankItem} />,
};

export const SemanticMatching: Story = {
  render: () => <Wrapper item={semanticItem} />,
};

export const Disabled: Story = {
  render: () => <Wrapper item={blankItem} disabled />,
};

export const PreFilled: Story = {
  render: () => (
    <FillBlankQuestion item={blankItem} value="Paris" onChange={() => {}} />
  ),
};
