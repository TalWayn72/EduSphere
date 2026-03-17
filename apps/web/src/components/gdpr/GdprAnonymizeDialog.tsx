/**
 * GdprAnonymizeDialog — WCAG-compliant alertdialog for irreversible GDPR anonymization.
 * Uses role="alertdialog" with typed confirmation to prevent accidental data erasure.
 */
import React, { useState, useRef, useEffect } from 'react';
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

const CONFIRMATION_WORD = 'ANONYMIZE';

interface GdprAnonymizeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
  processing?: boolean;
}

export function GdprAnonymizeDialog({
  open,
  onClose,
  onConfirm,
  userName,
  processing = false,
}: GdprAnonymizeDialogProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isConfirmed = typed === CONFIRMATION_WORD;

  useEffect(() => {
    if (open) {
      setTyped('');
      // Focus the confirmation input when dialog opens
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed && !processing) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="gdpr-anonymize-title"
        aria-describedby="gdpr-anonymize-desc"
        data-testid="gdpr-anonymize-dialog"
      >
        <DialogHeader>
          <DialogTitle id="gdpr-anonymize-title">
            Permanently Anonymize User Data
          </DialogTitle>
          <DialogDescription id="gdpr-anonymize-desc">
            This action is <strong>irreversible</strong>. All personal data
            {userName ? ` for ${userName}` : ''} will be permanently anonymized
            in compliance with GDPR Article 17 (Right to Erasure). This cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive font-medium">
              Warning: This will anonymize all PII including name, email,
              annotations, and activity logs for this user.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gdpr-confirm-input">
              Type <span className="font-mono font-bold">{CONFIRMATION_WORD}</span> to confirm
              <span className="sr-only">
                (type the word {CONFIRMATION_WORD} in uppercase to enable the anonymize button)
              </span>
            </Label>
            <Input
              ref={inputRef}
              id="gdpr-confirm-input"
              data-testid="gdpr-confirm-input"
              aria-label={`Type ${CONFIRMATION_WORD} to confirm anonymization`}
              aria-describedby="gdpr-confirm-hint"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRMATION_WORD}
              className="font-mono"
            />
            <p id="gdpr-confirm-hint" className="text-xs text-muted-foreground">
              {isConfirmed
                ? 'Confirmation matched. You may proceed.'
                : `Please type "${CONFIRMATION_WORD}" exactly to enable the button.`}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isConfirmed || processing}
              data-testid="gdpr-confirm-btn"
              aria-disabled={!isConfirmed || processing}
            >
              {processing ? 'Anonymizing...' : 'Anonymize Data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
