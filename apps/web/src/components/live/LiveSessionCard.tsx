/**
 * LiveSessionCard — course-page card for a live session.
 *
 * - LIVE phase: pulsing red badge + viewer count
 * - SCHEDULED / PRE_LIVE: countdown timer
 * - ENDED / CANCELLED: muted "Ended" badge
 * - Links to /live/:sessionId
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ViewerCount } from './ViewerCount';
import type { LiveStreamSession } from '@/types/live-session.types';
import { cn } from '@/lib/utils';

interface LiveSessionCardProps {
  session: LiveStreamSession;
  instructorName?: string;
  className?: string;
}

function useCountdown(target: string | null): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = Math.max(0, new Date(target).getTime() - Date.now());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(
        diff === 0
          ? 'Starting…'
          : [h > 0 && `${h}h`, m > 0 && `${m}m`, `${s}s`].filter(Boolean).join(' ')
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}

export function LiveSessionCard({ session, instructorName, className }: LiveSessionCardProps) {
  const countdown = useCountdown(
    session.phase === 'SCHEDULED' ? session.scheduledAt : null
  );

  return (
    <Link to={`/live/${session.id}`} className="block focus-visible:outline-none">
      <Card
        className={cn(
          'hover:shadow-md transition-shadow cursor-pointer',
          session.phase === 'LIVE' && 'ring-2 ring-red-500',
          className
        )}
        data-testid="live-session-card"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-zinc-900 dark:bg-zinc-800 rounded-t-xl overflow-hidden">
          {session.thumbnailUrl ? (
            <img src={session.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-4xl">
              📺
            </div>
          )}

          {/* Phase badge overlay */}
          {session.phase === 'LIVE' && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 dark:bg-red-700 text-white dark:text-white text-xs font-bold shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-white animate-pulse" aria-hidden="true" />
              LIVE
            </div>
          )}
          {session.phase === 'LIVE' && (
            <div className="absolute top-2 right-2">
              <ViewerCount count={session.viewerCount} compact />
            </div>
          )}
        </div>

        <CardContent className="p-3 flex flex-col gap-1">
          <p className="font-semibold text-sm leading-snug line-clamp-2" dir="auto">
            {session.title}
          </p>

          {instructorName && (
            <p className="text-xs text-muted-foreground" dir="auto">{instructorName}</p>
          )}

          {/* Status row */}
          <div className="flex items-center gap-2 mt-1">
            {session.phase === 'SCHEDULED' && countdown && (
              <Badge variant="outline" className="text-xs">
                🕐 {countdown}
              </Badge>
            )}
            {(session.phase === 'ENDED' || session.phase === 'CANCELLED') && (
              <Badge variant="secondary" className="text-xs">Ended</Badge>
            )}
            {session.phase === 'PAUSED' && (
              <Badge variant="outline" className="text-xs">Paused</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
