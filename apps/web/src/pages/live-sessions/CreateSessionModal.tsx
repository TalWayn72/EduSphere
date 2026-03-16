import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CreateSessionModalProps {
  onClose: () => void;
  onCreate: (name: string, contentId: string, scheduledAt: string) => void;
  loading: boolean;
}

export function CreateSessionModal({ onClose, onCreate, loading }: CreateSessionModalProps) {
  const [name, setName] = useState('');
  const [contentId] = useState('content-1');
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !scheduledAt) return;
    onCreate(name.trim(), contentId, scheduledAt);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="create-session-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Create Live Session"
    >
      <div className="bg-background rounded-xl border shadow-lg w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold mb-4">Create Live Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1" htmlFor="session-name">
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
            <label className="text-sm font-medium block mb-1" htmlFor="session-time">
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
          <div className="flex gap-2 justify-end mt-2">
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
          </div>
        </form>
      </div>
    </div>
  );
}
