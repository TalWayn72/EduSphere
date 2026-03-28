import type { Meta, StoryObj } from '@storybook/react';
import { AssessmentRadarChart } from './RadarChart';

const SAMPLE_CRITERIA = [
  { name: 'Critical Thinking', score: 85, maxScore: 100 },
  { name: 'Communication', score: 72, maxScore: 100 },
  { name: 'Problem Solving', score: 90, maxScore: 100 },
  { name: 'Collaboration', score: 65, maxScore: 100 },
  { name: 'Technical Skills', score: 88, maxScore: 100 },
  { name: 'Leadership', score: 55, maxScore: 100 },
];

const meta: Meta<typeof AssessmentRadarChart> = {
  title: 'Assessment/RadarChart',
  component: AssessmentRadarChart,
  decorators: [
    (Story) => (
      <div className="w-[400px] h-[400px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AssessmentRadarChart>;

export const Default: Story = {
  args: { criteria: SAMPLE_CRITERIA },
};

export const HighScores: Story = {
  args: {
    criteria: SAMPLE_CRITERIA.map((c) => ({ ...c, score: Math.min(c.maxScore, c.score + 10) })),
  },
};

export const LowScores: Story = {
  args: {
    criteria: SAMPLE_CRITERIA.map((c) => ({ ...c, score: Math.max(10, c.score - 40) })),
  },
};

export const FewCategories: Story = {
  args: {
    criteria: [
      { name: 'Theory', score: 80, maxScore: 100 },
      { name: 'Practice', score: 65, maxScore: 100 },
      { name: 'Application', score: 90, maxScore: 100 },
    ],
  },
};
