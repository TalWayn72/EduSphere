/**
 * CreateSessionModal — BUG-098: Converted from raw <div role="dialog"> to Radix Dialog
 * for proper a11y (focus trapping, Escape handling, DialogTitle/Description).
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface CreateSessionModalProps {
  onClose: () => void;
  onCreate: (name: string, contentId: string, scheduledAt: string) => void;
  loading: boolean;
}

export function CreateSessionModal({
  onClose,
  onCreate,
  loading,
}: CreateSessionModalProps) {
  const [name, setName] = useState('');
  const [contentId] = useState('b0000000-0000-0000-0000-000000000001');
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !scheduledAt) return;
    onCreate(name.trim(), contentId, scheduledAt);
  };

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent data-testid="create-session-modal" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Live Session</DialogTitle>
          <DialogDescription className="sr-only">
            Schedule a new live session with a title and time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="text-sm font-medium block mb-1"
              htmlFor="session-name"
            >
              Session Title
            </label>
            <input
              id="session-name"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly Study Session"
              required
              data-testid="session-name-input"
            />
          </div>
          <div>
            <label
              className="text-sm font-medium block mb-1"
              htmlFor="session-time"
            >
              Scheduled Time
            </label>
            <input
              id="session-time"
              type="datetime-local"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              data-testid="session-time-input"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim() || !scheduledAt}
              data-testid="create-session-submit"
            >
              {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Create Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
