import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Course Management',
    description: 'Create, edit, and manage your courses.',
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    title: 'Lesson Editor',
    description: 'Edit lesson content and media.',
    breadcrumbs: [
      { label: 'Courses', href: '/courses' },
      { label: 'GraphQL Federation' },
    ],
  },
};

export const WithActions: Story = {
  args: {
    title: 'All Courses',
    description: 'Browse and manage your course catalog.',
    actions: (
      <div className="flex gap-2">
        <Button variant="outline">Import</Button>
        <Button>Create Course</Button>
      </div>
    ),
  },
};

export const WithBackButton: Story = {
  args: {
    title: 'Quiz Results',
    backTo: '/courses/123',
  },
};

export const FullFeatured: Story = {
  args: {
    title: 'Module 3: Advanced Patterns',
    description: 'Learn about entity resolution and cross-subgraph queries.',
    breadcrumbs: [
      { label: 'Courses', href: '/courses' },
      { label: 'GraphQL Federation', href: '/courses/gql' },
      { label: 'Module 3' },
    ],
    actions: <Button>Next Lesson</Button>,
  },
};
