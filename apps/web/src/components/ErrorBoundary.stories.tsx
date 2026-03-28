import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenComponent(): React.ReactElement {
  throw new Error('Intentional test error');
}

function WorkingComponent() {
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-sm">This component renders successfully.</p>
    </div>
  );
}

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
};
export default meta;

type Story = StoryObj<typeof ErrorBoundary>;

export const WithError: Story = {
  render: () => (
    <ErrorBoundary pageName="StoryTest">
      <BrokenComponent />
    </ErrorBoundary>
  ),
};

export const WithoutError: Story = {
  render: () => (
    <ErrorBoundary pageName="StoryTest">
      <WorkingComponent />
    </ErrorBoundary>
  ),
};

export const CustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      pageName="StoryTest"
      fallback={
        <div className="p-8 text-center border rounded-lg bg-amber-50 dark:bg-amber-950">
          <p className="text-lg font-semibold">Custom Error UI</p>
          <p className="text-sm text-muted-foreground mt-1">A custom fallback was provided.</p>
        </div>
      }
    >
      <BrokenComponent />
    </ErrorBoundary>
  ),
};
