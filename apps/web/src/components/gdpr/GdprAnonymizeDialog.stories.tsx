import type { Meta, StoryObj } from '@storybook/react';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Simplified GdprAnonymizeDialog for Storybook (no state management dependency) */
function GdprAnonymizePreview({ confirmed }: { confirmed: boolean }) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anonymize User Data</DialogTitle>
          <DialogDescription>
            This action is irreversible. All personal data for this user will be
            permanently anonymized.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Label>Type ANONYMIZE to confirm</Label>
          <Input
            defaultValue={confirmed ? 'ANONYMIZE' : ''}
            placeholder="ANONYMIZE"
          />
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive" disabled={!confirmed}>
            Anonymize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const meta: Meta<typeof GdprAnonymizePreview> = {
  title: 'GDPR/GdprAnonymizeDialog',
  component: GdprAnonymizePreview,
};
export default meta;

type Story = StoryObj<typeof GdprAnonymizePreview>;

export const Default: Story = { args: { confirmed: false } };
export const Confirmed: Story = { args: { confirmed: true } };
