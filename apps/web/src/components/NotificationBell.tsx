/**
 * NotificationBell — real-time notification center in the Layout header.
 *
 * Features:
 *  - Bell icon with unread count badge (capped at 99)
 *  - Dropdown list of the 10 most recent notifications
 *  - Click a notification → mark as read
 *  - "Mark all as read" button
 *  - Type icons: 🏅 badge, 📚 course, 👤 follow, 🗂️ SRS, 📢 announcement
 *
 * Memory safety: useNotifications pauses the WebSocket subscription on unmount.
 */
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  type AppNotification,
  type NotificationType,
} from '@/hooks/useNotifications';
import { getCurrentUser } from '@/lib/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, string> = {
  BADGE_ISSUED: '🏅',
  COURSE_ENROLLED: '📚',
  USER_FOLLOWED: '👤',
  SRS_REVIEW_DUE: '🗂️',
  ANNOUNCEMENT: '📢',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const isUnread = notification.readAt === null;

  return (
    <button
      className={cn(
        'w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex gap-3 items-start',
        isUnread && 'bg-primary/5'
      )}
      onClick={() => onRead(notification.id)}
      aria-label={`${isUnread ? 'Unread: ' : ''}${notification.title}`}
    >
      <span className="text-lg leading-none mt-0.5 shrink-0" aria-hidden="true">
        {TYPE_ICON[notification.type] ?? '🔔'}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isUnread && 'font-semibold'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {isUnread && (
        <span
          className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

export function NotificationBell() {
  const user = getCurrentUser();
  const userId = user?.id ?? '';
  const { notifications, unreadCount, markAsRead } = useNotifications(userId);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as HTMLElement)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllAsRead = () => {
    notifications.forEach((n) => {
      if (n.readAt === null) markAsRead(n.id);
    });
  };

  const badgeCount = Math.min(unreadCount, 99);
  const recent = notifications.slice(0, 10);

  return (
    <div
      ref={containerRef}
      className="relative"
      data-testid="notification-bell"
    >
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-0.5"
            aria-hidden="true"
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-full mt-1 w-80 rounded-lg border bg-background shadow-lg z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              recent.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                />
              ))
            )}
          </div>

          {/* Footer: "View all" link to full notifications page */}
          <div className="px-4 py-2 border-t text-center">
            <Link
              to="/notifications"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
