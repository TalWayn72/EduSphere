/**
 * useNotifications — subscribes to real-time user notifications via GraphQL.
 *
 * Uses NOTIFICATION_RECEIVED_SUBSCRIPTION (urql useSubscription) to receive
 * server-sent Notification objects pushed from the NATS→PubSub→GraphQL pipeline.
 *
 * Memory safety:
 *  - Subscription is paused when the component unmounts (pause: true tied to
 *    mount state via useEffect cleanup) so the WebSocket subscription is torn
 *    down and not leaked.
 *
 * Returns:
 *  - notifications: ordered list (newest first)
 *  - unreadCount: count of notifications with no readAt value
 *  - markAsRead: marks a notification as read by id
 */
import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from 'urql';
import { NOTIFICATION_RECEIVED_SUBSCRIPTION } from '@/lib/graphql/notifications.subscriptions';

// ── Local types (until codegen generates these from the schema) ───────────────

export type NotificationType =
  | 'BADGE_ISSUED'
  | 'COURSE_ENROLLED'
  | 'USER_FOLLOWED'
  | 'SRS_REVIEW_DUE'
  | 'ANNOUNCEMENT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationReceivedSubscription {
  notificationReceived: AppNotification;
}

interface NotificationReceivedVariables {
  userId: string;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

/**
 * Prepend the incoming notification and cap the list at MAX_NOTIFICATIONS
 * to prevent unbounded memory growth.
 */
const MAX_NOTIFICATIONS = 100;

function prependNotification(
  prev: AppNotification[],
  incoming: AppNotification,
): AppNotification[] {
  const deduped = prev.filter((n) => n.id !== incoming.id);
  return [incoming, ...deduped].slice(0, MAX_NOTIFICATIONS);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
}

export function useNotifications(userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Memory safety: pause the subscription when the component unmounts so the
  // WebSocket connection is properly torn down and not leaked.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setPaused(false);
    return () => {
      setPaused(true);
    };
  }, []);

  // Subscribe — paused when userId is empty or component has unmounted.
  const [subscriptionResult] = useSubscription<
    NotificationReceivedSubscription,
    NotificationReceivedSubscription,
    NotificationReceivedVariables
  >({
    query: NOTIFICATION_RECEIVED_SUBSCRIPTION,
    variables: { userId },
    pause: paused || !userId,
  });

  // Append each incoming notification to the list.
  useEffect(() => {
    const incoming = subscriptionResult.data?.notificationReceived;
    if (!incoming) return;

    setNotifications((prev) => prependNotification(prev, incoming));
  }, [subscriptionResult.data]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
  }, []);

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  return { notifications, unreadCount, markAsRead };
}
