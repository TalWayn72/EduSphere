import {
  Calendar,
  Users,
  Loader2,
  StopCircle,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LiveSession } from './types';
import { formatRelativeTime } from './helpers';
import { StatusBadge } from './StatusBadge';

export interface SessionCardProps {
  session: LiveSession;
  isInstructor: boolean;
  onJoin: (id: string) => void;
  onStart: (id: string) => void;
  onEnd: (id: string) => void;
  onCancel: (id: string) => void;
  onOpen: (id: string) => void;
  joinFetching: boolean;
  startFetching: boolean;
  endFetching: boolean;
  cancelFetching: boolean;
}

export function SessionCard({
  session,
  isInstructor,
  onJoin,
  onStart,
  onEnd,
  onCancel,
  onOpen,
  joinFetching,
  startFetching,
  endFetching,
  cancelFetching,
}: SessionCardProps) {
  const isLive = session.status === 'LIVE';
  const isScheduled = session.status === 'SCHEDULED';

  return (
    <Card
      data-testid="session-card"
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onOpen(session.id)}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" data-testid="session-title">
              {session.meetingName}
            </p>
            {session.scheduledAt && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {isLive
                  ? 'Live Now!'
                  : formatRelativeTime(session.scheduledAt)}
              </p>
            )}
          </div>
          <StatusBadge status={session.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {session.participantCount ?? 0}
            {session.maxParticipants ? ` / ${session.maxParticipants}` : ''}{' '}
            participants
          </span>
          {session.courseId && (
            <span className="truncate">Course: {session.courseId}</span>
          )}
        </div>

        {/* INSTRUCTOR actions */}
        {isInstructor && isScheduled && (
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              data-testid="start-session-btn"
              disabled={startFetching}
              onClick={(e) => { e.stopPropagation(); onStart(session.id); }}
            >
              {startFetching
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <><PlayCircle className="h-3 w-3 mr-1" />Start</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              data-testid="cancel-session-btn"
              disabled={cancelFetching}
              onClick={(e) => { e.stopPropagation(); onCancel(session.id); }}
            >
              {cancelFetching
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <><XCircle className="h-3 w-3 mr-1" />Cancel</>}
            </Button>
          </div>
        )}
        {isInstructor && isLive && (
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              data-testid="manage-session-btn"
              onClick={(e) => { e.stopPropagation(); onOpen(session.id); }}
            >
              Manage
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              data-testid="end-session-btn"
              disabled={endFetching}
              onClick={(e) => { e.stopPropagation(); onEnd(session.id); }}
            >
              {endFetching
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <><StopCircle className="h-3 w-3 mr-1" />End</>}
            </Button>
          </div>
        )}

        {/* STUDENT actions — only join when LIVE */}
        {!isInstructor && isLive && (
          <Button
            size="sm"
            variant="default"
            className="w-full mt-1"
            data-testid="join-session-btn"
            disabled={joinFetching}
            onClick={(e) => { e.stopPropagation(); onJoin(session.id); }}
          >
            {joinFetching
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : 'Join'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
