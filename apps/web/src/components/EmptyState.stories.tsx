import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { EmptyState } from './EmptyState';
import { FileText, Search, BookOpen } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: { onAction: fn() },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    title: 'No courses found',
    description: 'Get started by creating your first course.',
  },
};

export const WithIcon: Story = {
  args: {
    icon: <BookOpen className="h-8 w-8 text-muted-foreground" />,
    title: 'No courses yet',
    description: 'Create your first course to get started with EduSphere.',
    actionLabel: 'Create Course',
  },
};

export const SearchEmpty: Story = {
  args: {
    icon: <Search className="h-8 w-8 text-muted-foreground" />,
    title: 'No results',
    description: 'Try adjusting your search or filter criteria.',
  },
};

export const NoDocuments: Story = {
  args: {
    icon: <FileText className="h-8 w-8 text-muted-foreground" />,
    title: 'No documents',
    description: 'Upload a document to start annotating.',
    actionLabel: 'Upload Document',
  },
};

export const Minimal: Story = {
  args: {
    title: 'Nothing here',
  },
};
