import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Courses', href: '/courses' },
      { label: 'GraphQL Federation', href: '/courses/gql-fed' },
      { label: 'Lesson 3' },
    ],
  },
};

export const SingleItem: Story = {
  args: {
    items: [{ label: 'Dashboard' }],
  },
};

export const Deep: Story = {
  args: {
    items: [
      { label: 'Admin', href: '/admin' },
      { label: 'Courses', href: '/admin/courses' },
      { label: 'Course Details', href: '/admin/courses/123' },
      { label: 'Module 2', href: '/admin/courses/123/modules/2' },
      { label: 'Lesson 5' },
    ],
  },
};
