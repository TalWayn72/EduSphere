import { useState } from 'react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import {
  useNotifications,
  type AppNotification,
  type NotificationType,
} from '@/hooks/useNotifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, string> = {
  BADGE_ISSUED: '🏅',
  COURSE_ENROLLED: '📚',
  USER_FOLLOWED: '👤',
  SRS_REVIEW_DUE: '🗂️',
  ANNOUNCEMENT: '📢',
};

type FilterKey = 'ALL' | 'UNREAD' | NotificationType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'BADGE_ISSUED', label: '🏅 Badge' },
  { key: 'COURSE_ENROLLED', label: '📚 Course' },
  { key: 'USER_FOLLOWED', label: '👤 Follow' },
  { key: 'SRS_REVIEW_DUE', label: '🗂️ SRS' },
  { key: 'ANNOUNCEMENT', label: '📢 Announce' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function dateLabel(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

// ─── NotificationsPage ────────────────────────────────────────────────────────

export function NotificationsPage() {
  const user = getCurrentUser();
  const { notifications, markAsRead } = useNotifications(user?.id ?? '');
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.readAt;
    if (filter === 'ALL') return true;
    return n.type === filter;
  });

  const grouped = filtered.reduce<Record<string, AppNotification[]>>((acc, n) => {
    const g = dateLabel(n.createdAt);
    (acc[g] ??= []).push(n);
    return acc;
  }, {});

  function markAllRead() {
    notifications.filter((n) => !n.readAt).forEach((n) => markAsRead(n.id));
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6" role="tablist" aria-label="Filter notifications">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              {key === 'UNREAD' ? `Unread (${unreadCount})` : label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
            <BellOff className="h-10 w-10 opacity-40" />
            <p className="text-sm">
              {filter === 'ALL' ? 'No notifications yet.' : 'No notifications match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['Today', 'Yesterday', 'Earlier'] as const)
              .filter((g) => grouped[g]?.length)
              .map((group) => (
                <section key={group}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    {group}
                  </h2>
                  <ul className="space-y-1">
                    {(grouped[group] ?? []).map((n) => (
                      <li
                        key={n.id}
                        className={[
                          'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                          n.readAt
                            ? 'hover:bg-muted/50'
                            : 'bg-primary/5 border border-primary/10 hover:bg-primary/10',
                        ].join(' ')}
                        onClick={() => markAsRead(n.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && markAsRead(n.id)}
                      >
                        <span className="text-xl leading-none mt-0.5" aria-hidden="true">
                          {TYPE_ICON[n.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={['text-sm', n.readAt ? 'font-medium' : 'font-semibold'].join(' ')}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                          {!n.readAt && (
                            <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
