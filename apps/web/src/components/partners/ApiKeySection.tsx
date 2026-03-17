/**
 * ApiKeySection — API key display + regenerate with confirmation dialog.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  currentKey: string;
  showPlain: boolean;
  onRegenerate: () => void;
  regenerating: boolean;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return 'esph_•••••••••••••••••';
  return `${key.slice(0, 8)}${'•'.repeat(Math.max(0, key.length - 8))}`;
}

export function ApiKeySection({ currentKey, showPlain, onRegenerate, regenerating }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    setConfirmOpen(false);
    onRegenerate();
  };

  return (
    <>
      <Card data-testid="api-key-section">
        <CardHeader><CardTitle>Your API Key</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded bg-muted px-4 py-2 font-mono text-sm" data-testid="api-key-display">
              {showPlain ? currentKey : maskKey(currentKey)}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={regenerating}
              data-testid="regenerate-key-btn"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </div>
          {showPlain && (
            <p className="mt-2 text-xs text-amber-600 font-medium" data-testid="new-key-notice">
              Copy this key now — it will not be shown again after you leave this page.
            </p>
          )}
          <div className="mt-4 flex gap-4 text-sm">
            <a href="/api/v1/partner/usage" className="text-primary underline underline-offset-2">
              /api/v1/partner/usage
            </a>
            <a href="/docs/partner-api" className="text-primary underline underline-offset-2">
              API Documentation
            </a>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate API Key?</DialogTitle>
            <DialogDescription>
              This will permanently invalidate your current key. All integrations using the old key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} data-testid="confirm-regenerate-btn">
              Regenerate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
