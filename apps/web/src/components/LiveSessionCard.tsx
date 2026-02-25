/**
 * LiveSessionCard — displays live session info and join/start controls.
 * Used by ContentViewer for LIVE_SESSION content type.
 */
import { useState } from 'react';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Radio, Clock, ExternalLink } from 'lucide-react';
import { JOIN_LIVE_SESSION_MUTATION } from '@/lib/graphql/live-session.queries';

interface LiveSessionData {
  id: string;
  meetingName: string;
  scheduledAt: string;
  status: string;
  recordingUrl: string | null;
}

interface LiveSessionCardProps {
  liveSession: LiveSessionData;
  userRole?: string;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  LIVE: 'bg-green-100 text-green-800',
  ENDED: 'bg-gray-100 text-gray-700',
  RECORDING: 'bg-yellow-100 text-yellow-800',
};

export function LiveSessionCard({ liveSession, userRole = 'LEARNER' }: LiveSessionCardProps) {
  const { t } = useTranslation('content');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [, joinSession] = useMutation(JOIN_LIVE_SESSION_MUTATION);

  const isModerator = ['INSTRUCTOR', 'ADMIN', 'ORG_ADMIN'].includes(userRole);
  const canJoin = liveSession.status === 'LIVE' || liveSession.status === 'SCHEDULED';
  const scheduledDate = new Date(liveSession.scheduledAt);
  const statusClass = STATUS_COLORS[liveSession.status] ?? 'bg-gray-100 text-gray-700';

  const handleJoin = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinSession({ sessionId: liveSession.id });
      if (result.error) {
        setJoinError(result.error.message);
        return;
      }
      const joinUrl: string = (result.data as { joinLiveSession?: string })?.joinLiveSession ?? '';
      if (joinUrl) {
        window.open(joinUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setJoinError(t('liveSession.joinError'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            {liveSession.meetingName}
          </CardTitle>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${statusClass}`}>
            {liveSession.status === 'LIVE' && (
              <Radio className="h-3 w-3 animate-pulse" />
            )}
            {liveSession.status}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {scheduledDate.toLocaleDateString()}{' '}
            {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {joinError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">
            {joinError}
          </p>
        )}

        {canJoin && (
          <Button
            className="w-full"
            onClick={() => void handleJoin()}
            disabled={joining}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {joining
              ? t('liveSession.joining')
              : isModerator
                ? t('liveSession.startMeeting')
                : t('liveSession.joinSession')}
          </Button>
        )}

        {liveSession.status === 'ENDED' && liveSession.recordingUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('liveSession.recordingAvailable')}</p>
            <video
              src={liveSession.recordingUrl}
              controls
              className="w-full rounded-md aspect-video bg-black"
              aria-label={`Recording of ${liveSession.meetingName}`}
            />
          </div>
        )}

        {liveSession.status === 'RECORDING' && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('liveSession.processingRecording')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
