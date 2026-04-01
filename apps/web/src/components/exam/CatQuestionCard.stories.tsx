import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CatQuestionCard } from './CatQuestionCard';

const meta: Meta<typeof CatQuestionCard> = {
  title: 'Exam/CatQuestionCard',
  component: CatQuestionCard,
  args: { onSelect: fn() },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof CatQuestionCard>;

const OPTIONS = [
  {
    id: 'a',
    text: 'Apache AGE stores data as property graphs with vertices and edges',
  },
  { id: 'b', text: 'Apache AGE is a document database engine' },
  { id: 'c', text: 'Apache AGE only supports directed acyclic graphs' },
  { id: 'd', text: 'Apache AGE requires a separate server instance' },
];

export const Default: Story = {
  args: {
    stem: 'Which statement best describes Apache AGE?',
    options: OPTIONS,
    selectedAnswer: null,
  },
};

export const WithSelection: Story = {
  args: {
    stem: 'Which statement best describes Apache AGE?',
    options: OPTIONS,
    selectedAnswer: 'a',
  },
};

export const LongStem: Story = {
  args: {
    stem: 'Given a GraphQL Federation v2 schema with 6 subgraphs where the User entity is owned by the Core subgraph and extended by Annotation and Collaboration subgraphs via @key directives, what is the correct approach to resolve cross-subgraph references?',
    options: OPTIONS,
    selectedAnswer: null,
  },
};
