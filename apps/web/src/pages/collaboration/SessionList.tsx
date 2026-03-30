/**
 * SessionList — active Chavruta sessions and recent discussions.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, BookOpen, Plus } from 'lucide-react';
import type { BackendDiscussion } from './collaboration.types';
import { toSessionUrl, formatRelativeTime } from './collaboration.types';

interface SessionListProps {
  activeSessions: BackendDiscussion[];
  recentSessions: BackendDiscussion[];
  fetching: boolean;
  isCreating: boolean;
  onCreateChavruta: () => void;
}

export function SessionList({
  activeSessions,
  recentSessions,
  fetching,
  isCreating,
  onCreateChavruta,
}: SessionListProps) {
  const { t } = useTranslation(['collaboration']);
  const navigate = useNavigate();

  return (
    <>
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('activeSessions')}
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {activeSessions.map((session) => (
              <Card key={session.id} className="border-green-200 bg-green-50/50 dark:border-green-700 dark:bg-green-950/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse dark:bg-green-600" />
                        <span className="text-sm font-semibold truncate max-w-[160px]">{session.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {session.participantCount} participants
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(session.createdAt)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-green-600 hover:bg-green-700 dark:bg-green-500"
                      onClick={() => navigate(toSessionUrl(session.title, session.id))}
                    >
                      {t('rejoin')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent discussions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('recentDiscussions')}
          </h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onCreateChavruta} disabled={isCreating}>
            <Plus className="h-3.5 w-3.5" />
            {t('newSession')}
          </Button>
        </div>

        {recentSessions.length === 0 && !fetching && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('noSessions')}</p>
            <p className="text-xs mt-1">{t('noSessionsHint')}</p>
          </div>
        )}

        <div className="space-y-2">
          {recentSessions.map((session) => (
            <Card key={session.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(toSessionUrl(session.title, session.id))}>
              <CardContent className="p-3 flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.discussionType} &middot; {session.messageCount} messages</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(session.updatedAt)}</p>
                  <p className="text-xs text-muted-foreground">{session.participantCount} participants</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
