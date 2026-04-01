import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload } from 'lucide-react';

/** Simplified ScormImportDialog for Storybook (no urql dependency) */
function ScormImportPreview({
  status,
}: {
  status: 'idle' | 'uploading' | 'success' | 'error';
}) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import SCORM Package</DialogTitle>
          <DialogDescription>
            Upload a SCORM 1.2 or 2004 ZIP package to create a new course.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center">
          {status === 'idle' && (
            <div className="border-2 border-dashed rounded-lg p-8 text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">
                Drag a .zip file here or click to browse
              </p>
            </div>
          )}
          {status === 'uploading' && (
            <p className="text-sm">Uploading package... 65%</p>
          )}
          {status === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Package imported successfully!
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm text-destructive">
              Upload failed. Please try again.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button disabled={status === 'uploading'}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const meta: Meta<typeof ScormImportPreview> = {
  title: 'SCORM/ScormImportDialog',
  component: ScormImportPreview,
};
export default meta;

type Story = StoryObj<typeof ScormImportPreview>;

export const Idle: Story = { args: { status: 'idle' } };
export const Uploading: Story = { args: { status: 'uploading' } };
export const Success: Story = { args: { status: 'success' } };
export const Error: Story = { args: { status: 'error' } };
