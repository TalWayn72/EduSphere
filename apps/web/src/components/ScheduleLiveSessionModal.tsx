/**
 * ScheduleLiveSessionModal — instructor creates a live session for a content item.
 */
import { useState } from 'react';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CREATE_LIVE_SESSION_MUTATION } from '@/lib/graphql/live-session.queries';

interface ScheduleLiveSessionModalProps {
  contentItemId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function ScheduleLiveSessionModal({
  contentItemId,
  open,
  onClose,
  onCreated,
}: ScheduleLiveSessionModalProps) {
  const { t } = useTranslation('content');
  const [meetingName, setMeetingName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [{ fetching }, createSession] = useMutation(CREATE_LIVE_SESSION_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!meetingName.trim() || !scheduledAt) {
      setError(t('liveSession.validationError'));
      return;
    }

    const result = await createSession({
      contentItemId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      meetingName: meetingName.trim(),
    });

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onCreated?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('liveSession.scheduleTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label
              htmlFor="meeting-name"
              className="text-sm font-medium"
            >
              {t('liveSession.meetingName')}
            </label>
            <input
              id="meeting-name"
              type="text"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder={t('liveSession.meetingNamePlaceholder')}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="scheduled-at"
              className="text-sm font-medium"
            >
              {t('liveSession.scheduledAt')}
            </label>
            <input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={fetching}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={fetching}>
              {fetching ? t('liveSession.scheduling') : t('liveSession.scheduleButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
