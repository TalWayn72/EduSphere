import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SkillPathCard } from './SkillPathCard';
import { MemoryRouter } from 'react-router-dom';

const SAMPLE_PATH = {
  id: 'sp-1',
  title: 'Full-Stack Developer Path',
  description:
    'Master frontend, backend, and database technologies for modern web development.',
  targetRole: 'Senior Full-Stack Developer',
  skillIds: ['s1', 's2', 's3', 's4', 's5'],
  estimatedHours: 120,
  isPublished: true,
};

const SAMPLE_PROGRESS = [
  { skillId: 's1', masteryLevel: 'mastered', evidenceCount: 5 },
  { skillId: 's2', masteryLevel: 'proficient', evidenceCount: 3 },
  { skillId: 's3', masteryLevel: 'familiar', evidenceCount: 2 },
  { skillId: 's4', masteryLevel: 'attempted', evidenceCount: 1 },
  { skillId: 's5', masteryLevel: 'none', evidenceCount: 0 },
];

const meta: Meta<typeof SkillPathCard> = {
  title: 'Skills/SkillPathCard',
  component: SkillPathCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-md">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SkillPathCard>;

export const Default: Story = {
  args: { path: SAMPLE_PATH, progress: SAMPLE_PROGRESS },
};

export const NoProgress: Story = {
  args: {
    path: SAMPLE_PATH,
    progress: SAMPLE_PATH.skillIds.map((id) => ({
      skillId: id,
      masteryLevel: 'none',
      evidenceCount: 0,
    })),
  },
};

export const Complete: Story = {
  args: {
    path: SAMPLE_PATH,
    progress: SAMPLE_PATH.skillIds.map((id) => ({
      skillId: id,
      masteryLevel: 'mastered',
      evidenceCount: 5,
    })),
  },
};

export const Draft: Story = {
  args: {
    path: {
      ...SAMPLE_PATH,
      isPublished: false,
      title: 'Data Science Path (Draft)',
    },
    progress: SAMPLE_PROGRESS,
  },
};
