import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { LikertQuestion } from './LikertQuestion';
import type { Likert } from '@/types/quiz';

const fivePoint: Likert = {
  type: 'LIKERT',
  question:
    'How confident are you in applying calculus to real-world problems?',
  scale: 5,
  labels: { min: 'Not Confident', max: 'Very Confident' },
};

const sevenPoint: Likert = {
  type: 'LIKERT',
  question: 'Rate the quality of the course materials provided.',
  scale: 7,
  labels: { min: 'Very Poor', max: 'Excellent' },
};

const defaultLabels: Likert = {
  type: 'LIKERT',
  question: 'The instructor explains concepts clearly.',
  scale: 5,
};

function Wrapper({ item, disabled }: { item: Likert; disabled?: boolean }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <LikertQuestion
      item={item}
      value={value}
      onChange={setValue}
      disabled={disabled}
    />
  );
}

const meta: Meta<typeof LikertQuestion> = {
  title: 'Quiz/LikertQuestion',
  component: LikertQuestion,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof LikertQuestion>;

export const FivePointScale: Story = {
  render: () => <Wrapper item={fivePoint} />,
};

export const SevenPointScale: Story = {
  render: () => <Wrapper item={sevenPoint} />,
};

export const DefaultLabels: Story = {
  render: () => <Wrapper item={defaultLabels} />,
};

export const Selected: Story = {
  render: () => (
    <LikertQuestion item={fivePoint} value={4} onChange={() => {}} />
  ),
};

export const Disabled: Story = {
  render: () => <Wrapper item={fivePoint} disabled />,
};
