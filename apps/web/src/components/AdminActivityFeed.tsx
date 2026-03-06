/**
 * AdminActivityFeed — shows the last 10 platform activity events.
 *
 * Uses mock data when the real adminActivityFeed query is unavailable.
 * Auto-refreshes every 60 seconds. Interval is always cleared on unmount
 * (memory-safety rule: every setInterval MUST clearInterval in useEffect cleanup).
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UserPlus,
  BookOpen,
  GraduationCap,
  Video,
  Bot,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'USER_ENROLLED'
  | 'LESSON_CREATED'
  | 'USER_REGISTERED'
  | 'SESSION_STARTED'
  | 'AGENT_COMPLETED';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  userId?: string;
  createdAt: string; // ISO-8601
}

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'USER_ENROLLED',
    description: 'Student enrolled in "Introduction to Philosophy"',
    userId: 'u1',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-2',
    type: 'LESSON_CREATED',
    description: 'Instructor created lesson "Free Will & Determinism"',
    userId: 'u2',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-3',
    type: 'USER_REGISTERED',
    description: 'New user registered: researcher@example.com',
    userId: 'u3',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-4',
    type: 'SESSION_STARTED',
    description: 'Live session "Chavruta: Maimonides" started',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-5',
    type: 'AGENT_COMPLETED',
    description: 'AI agent completed quiz generation for "Ethics Unit 3"',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-6',
    type: 'USER_ENROLLED',
    description: 'Student enrolled in "Advanced Talmud Studies"',
    userId: 'u4',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-7',
    type: 'LESSON_CREATED',
    description: 'Instructor created lesson "Aristotle on Virtue"',
    userId: 'u5',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const ACTIVITY_ICON: Record<ActivityType, React.ElementType> = {
  USER_ENROLLED: GraduationCap,
  LESSON_CREATED: BookOpen,
  USER_REGISTERED: UserPlus,
  SESSION_STARTED: Video,
  AGENT_COMPLETED: Bot,
};

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  USER_ENROLLED: 'text-blue-500',
  LESSON_CREATED: 'text-green-500',
  USER_REGISTERED: 'text-indigo-500',
  SESSION_STARTED: 'text-orange-500',
  AGENT_COMPLETED: 'text-purple-500',
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-3" data-testid="activity-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface AdminActivityFeedProps {
  /** Override items (used in tests or when real data arrives via GraphQL) */
  items?: ActivityItem[];
  /** Show loading skeleton */
  loading?: boolean;
  /** Auto-refresh interval in ms (default: 60 000). Set 0 to disable. */
  refreshIntervalMs?: number;
}

const REFRESH_INTERVAL_MS = 60_000;

export function AdminActivityFeed({
  items: externalItems,
  loading = false,
  refreshIntervalMs = REFRESH_INTERVAL_MS,
}: AdminActivityFeedProps = {}) {
  const { t } = useTranslation('admin');

  // Internal tick counter to trigger re-renders for relative timestamp updates
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  // Memory-safety: always clear the interval on unmount
  useEffect(() => {
    if (refreshIntervalMs <= 0) return;
    intervalRef.current = setInterval(() => {
      setTick((n) => n + 1);
    }, refreshIntervalMs);
    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshIntervalMs]);

  // Suppress unused-variable warning for tick — it exists only to trigger re-renders
  void tick;

  const items = externalItems ?? MOCK_ACTIVITIES;

  return (
    <Card data-testid="admin-activity-feed">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-primary" />
          {t('activityFeed.title')}
        </CardTitle>
        <Link
          to="/admin/audit-log"
          className="text-xs text-primary hover:underline"
          data-testid="activity-feed-view-all"
        >
          {t('activityFeed.viewAll')}
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <ActivitySkeleton />
        ) : items.length === 0 ? (
          <p
            className="text-sm text-muted-foreground text-center py-4"
            data-testid="activity-feed-empty"
          >
            {t('activityFeed.noActivity')}
          </p>
        ) : (
          <ul className="space-y-3" data-testid="activity-feed-list">
            {items.slice(0, 10).map((item) => {
              const Icon = ACTIVITY_ICON[item.type] ?? Activity;
              const colorClass = ACTIVITY_COLOR[item.type] ?? 'text-muted-foreground';
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3"
                  data-testid={`activity-item-${item.id}`}
                >
                  <span className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-snug">
                      {item.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {relativeTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
