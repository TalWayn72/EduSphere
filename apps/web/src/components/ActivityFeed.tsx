import { ActivityItem } from '@/lib/mock-analytics';
import { BookOpen, Brain, FileText, MessageSquare, Zap } from 'lucide-react';
import { formatRelativeTime } from '@/lib/activity-feed.utils';

interface ActivityFeedProps {
  items: ActivityItem[];
}

const ACTIVITY_ICONS = {
  study: BookOpen,
  quiz: Zap,
  annotation: FileText,
  ai_session: Brain,
  discussion: MessageSquare,
} as const;

const ACTIVITY_COLORS = {
  study: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  quiz: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
  annotation:
    'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  ai_session:
    'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  discussion:
    'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
} as const;

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type];
        const colorClass = ACTIVITY_COLORS[item.type];
        return (
          <div key={item.id} className="flex items-start gap-3">
            <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {item.description}
              </p>
              {item.courseTitle && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {item.courseTitle}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatRelativeTime(item.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
