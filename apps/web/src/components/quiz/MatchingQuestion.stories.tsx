import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MatchingQuestion } from './MatchingQuestion';
import type { Matching } from '@/types/quiz';

const sampleItem: Matching = {
  type: 'MATCHING',
  question: 'Match the country to its capital city:',
  leftItems: [
    { id: 'l1', text: 'France' },
    { id: 'l2', text: 'Germany' },
    { id: 'l3', text: 'Japan' },
    { id: 'l4', text: 'Brazil' },
  ],
  rightItems: [
    { id: 'r1', text: 'Tokyo' },
    { id: 'r2', text: 'Paris' },
    { id: 'r3', text: 'Berlin' },
    { id: 'r4', text: 'Brasilia' },
  ],
  correctPairs: [
    { leftId: 'l1', rightId: 'r2' },
    { leftId: 'l2', rightId: 'r3' },
    { leftId: 'l3', rightId: 'r1' },
    { leftId: 'l4', rightId: 'r4' },
  ],
};

function Wrapper({ disabled }: { disabled?: boolean }) {
  const [value, setValue] = useState<Array<{ leftId: string; rightId: string }>>([]);
  return <MatchingQuestion item={sampleItem} value={value} onChange={setValue} disabled={disabled} />;
}

const meta: Meta<typeof MatchingQuestion> = {
  title: 'Quiz/MatchingQuestion',
  component: MatchingQuestion,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof MatchingQuestion>;

export const Default: Story = {
  render: () => <Wrapper />,
};

export const WithPairs: Story = {
  render: () => (
    <MatchingQuestion
      item={sampleItem}
      value={[
        { leftId: 'l1', rightId: 'r2' },
        { leftId: 'l3', rightId: 'r1' },
      ]}
      onChange={() => {}}
    />
  ),
};

export const AllMatched: Story = {
  render: () => (
    <MatchingQuestion
      item={sampleItem}
      value={sampleItem.correctPairs}
      onChange={() => {}}
    />
  ),
};

export const Disabled: Story = {
  render: () => <Wrapper disabled />,
};
