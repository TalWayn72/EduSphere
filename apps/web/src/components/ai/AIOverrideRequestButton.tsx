// EU AI Act Art. 14 — Human oversight mechanism
import React, { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface AIOverrideRequestButtonProps {
  assessmentId: string;
  onSubmit?: (reason: string) => void | Promise<void>;
  className?: string;
}

export function AIOverrideRequestButton({
  assessmentId,
  onSubmit,
  className,
}: AIOverrideRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus close button when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => closeRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async () => {
    await onSubmit?.(reason);
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setReason('');
    }, 1500);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        role="button"
        aria-label="Request human review of this AI assessment"
        onClick={() => setOpen(true)}
        data-assessment-id={assessmentId}
      >
        <Info className="h-4 w-4 mr-2" aria-hidden="true" />
        Request Human Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          role="dialog"
          aria-labelledby="human-review-title"
          aria-describedby="human-review-description"
        >
          <DialogHeader>
            <DialogTitle id="human-review-title">
              Request Human Review
            </DialogTitle>
            <DialogDescription id="human-review-description">
              You have the right to request a human review of any AI-generated
              assessment or recommendation. A qualified educator will review
              your case and respond within 2 business days.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-green-600 py-2"
            >
              Your review request has been submitted successfully.
            </p>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="review-reason"
                className="text-sm font-medium block"
              >
                Reason for review{' '}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="review-reason"
                placeholder="Describe why you believe this assessment needs human review..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={1000}
                aria-describedby="human-review-description"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              ref={closeRef}
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Close dialog"
            >
              Cancel
            </Button>
            {!submitted && (
              <Button onClick={() => void handleSubmit()}>
                Submit Request
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
