import { Clock, PlayCircle, MessageSquare } from 'lucide-react';
import { Annotation, AnnotationLayer } from '@/types/annotations';

export const ANNOTATION_LAYER_META: Record<
  AnnotationLayer,
  { label: string; color: string; bg: string; icon: string }
> = {
  [AnnotationLayer.PERSONAL]: {
    label: 'Personal',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
    icon: '🔒',
  },
  [AnnotationLayer.SHARED]: {
    label: 'Shared',
    color: 'text-blue-700',
    bg: 'bg-blue-50   border-blue-200',
    icon: '👥',
  },
  [AnnotationLayer.INSTRUCTOR]: {
    label: 'Instructor',
    color: 'text-green-700',
    bg: 'bg-green-50  border-green-200',
    icon: '🎓',
  },
  [AnnotationLayer.AI_GENERATED]: {
    label: 'AI',
    color: 'text-amber-700',
    bg: 'bg-amber-50  border-amber-200',
    icon: '🤖',
  },
};

export function formatAnnotationTimestamp(ts?: number): string {
  if (!ts) return '';
  const m = Math.floor(ts / 60);
  const s = Math.floor(ts % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AnnotationCard({
  ann,
  onSeek,
}: {
  ann: Annotation;
  onSeek: (id: string, ts?: number) => void;
}) {
  const meta = ANNOTATION_LAYER_META[ann.layer];
  return (
    <div className={`p-3 rounded-md border text-sm space-y-1.5 ${meta.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span>{meta.icon}</span>
          <span className={`text-xs font-semibold ${meta.color}`}>
            {ann.userName}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color} border text-[10px]`}
          >
            {meta.label}
          </span>
        </div>
        {ann.contentTimestamp !== undefined && (
          <button
            onClick={() => onSeek(ann.contentId, ann.contentTimestamp)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Clock className="h-3 w-3" />
            {formatAnnotationTimestamp(ann.contentTimestamp)}
            <PlayCircle className="h-3 w-3" />
          </button>
        )}
      </div>
      <p className="leading-snug text-xs">{ann.content}</p>
      {ann.replies && ann.replies.length > 0 && (
        <div className="ml-3 pt-1.5 border-l-2 border-current/20 pl-3 space-y-1">
          {ann.replies.map((reply: Annotation) => (
            <div key={reply.id} className="text-xs text-muted-foreground">
              <span className="font-medium">{reply.userName}: </span>
              {reply.content}
            </div>
          ))}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {ann.replies.length}{' '}
            {ann.replies.length === 1 ? 'reply' : 'replies'}
          </div>
        </div>
      )}
    </div>
  );
}
