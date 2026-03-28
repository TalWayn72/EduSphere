import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CourseCard } from './CourseCard';

const meta: Meta<typeof CourseCard> = {
  title: 'Components/CourseCard',
  component: CourseCard,
  args: { onClick: fn() },
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof CourseCard>;

export const Default: Story = {
  args: {
    id: 'c-1',
    title: 'Advanced GraphQL Federation',
    instructor: 'Dr. Sarah Chen',
    category: 'Programming',
    lessonCount: 24,
    estimatedHours: 12,
  },
};

export const Enrolled: Story = {
  args: {
    id: 'c-2',
    title: 'React 19 Concurrency Patterns',
    instructor: 'Alex Rivera',
    category: 'Programming',
    lessonCount: 18,
    estimatedHours: 9,
    enrolled: true,
    progress: 65,
    mastery: 'familiar',
  },
};

export const Featured: Story = {
  args: {
    id: 'c-3',
    title: 'Introduction to AI Ethics',
    instructor: 'Prof. Maria Lopez',
    category: 'Science',
    lessonCount: 12,
    estimatedHours: 6,
    featured: true,
  },
};

export const Completed: Story = {
  args: {
    id: 'c-4',
    title: 'Data Structures Masterclass',
    instructor: 'John Park',
    category: 'Programming',
    lessonCount: 30,
    estimatedHours: 15,
    enrolled: true,
    progress: 100,
    mastery: 'mastered',
  },
};

export const DesignCategory: Story = {
  args: {
    id: 'c-5',
    title: 'UX Research Fundamentals',
    instructor: 'Emily Watson',
    category: 'Design',
    lessonCount: 16,
    estimatedHours: 8,
  },
};

export const LongTitle: Story = {
  args: {
    id: 'c-6',
    title: 'Complete Full-Stack Development with GraphQL Federation, NestJS, React 19 and PostgreSQL 16',
    instructor: 'Multiple Instructors',
    category: 'Programming',
    lessonCount: 60,
    estimatedHours: 40,
  },
};
