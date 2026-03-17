/**
 * RejectDialog — confirmation dialog for rejecting an annotation proposal.
 * Uses shadcn Dialog (Radix) for accessible modal.
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectDialog({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Proposal</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The student will be notified of the rejection.
          </DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Reason (optional)
          </label>
          <textarea
            id="reject-reason"
            data-testid="reject-reason-input"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Explain why this proposal was rejected..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            data-testid="confirm-reject-btn"
          >
            Reject Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
