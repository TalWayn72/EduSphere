import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { toast } from 'sonner';
import { Toaster } from './sonner';
import { Button } from './button';

const meta: Meta<typeof Toaster> = {
  title: 'UI/Sonner',
  component: Toaster,
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  render: () => (
    <>
      <Toaster />
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => toast('Default notification')}>
          Default Toast
        </Button>
        <Button variant="outline" onClick={() => toast.success('Course published successfully!')}>
          Success
        </Button>
        <Button variant="outline" onClick={() => toast.error('Failed to save changes')}>
          Error
        </Button>
        <Button variant="outline" onClick={() => toast.info('Your session expires in 5 minutes')}>
          Info
        </Button>
        <Button variant="outline" onClick={() => toast.warning('Unsaved changes detected')}>
          Warning
        </Button>
      </div>
    </>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <>
      <Toaster />
      <Button
        onClick={() =>
          toast('Course Created', {
            description: 'Introduction to AI Ethics has been added to your catalog.',
          })
        }
      >
        Toast with Description
      </Button>
    </>
  ),
};

export const WithAction: Story = {
  render: () => (
    <>
      <Toaster />
      <Button
        onClick={() =>
          toast('Lesson deleted', {
            action: { label: 'Undo', onClick: () => toast.success('Restored!') },
          })
        }
      >
        Toast with Action
      </Button>
    </>
  ),
};
