import { cn } from '@/lib/utils';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, ArrowRight, Star } from 'lucide-react';

export interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  category: string;
  lessonCount: number;
  estimatedHours: number;
  enrolled?: boolean;
  progress?: number;
  mastery?: 'none' | 'attempted' | 'familiar' | 'proficient' | 'mastered';
  featured?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CATEGORY_GRADIENTS: Record<string, string> = {
  Programming:
    'bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600',
  Design:
    'bg-gradient-to-br from-pink-500 via-rose-400 to-orange-400',
  Business:
    'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600',
  Science:
    'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600',
  Languages:
    'bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-300',
  Arts:
    'bg-gradient-to-br from-fuchsia-500 via-purple-400 to-violet-500',
  Mathematics:
    'bg-gradient-to-br from-violet-600 via-indigo-500 to-blue-500',
  History:
    'bg-gradient-to-br from-amber-600 via-orange-500 to-red-400',
  default:
    'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600',
};

function getCategoryInitials(category: string): string {
  return category
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function CourseCard({
  id,
  title,
  instructor,
  category,
  lessonCount,
  estimatedHours,
  enrolled = false,
  progress = 0,
  mastery = 'none',
  featured = false,
  onClick,
  className,
}: CourseCardProps) {
  const gradient =
    CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS['default'];

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <article
      role="article"
      aria-label={title}
      data-testid={`course-card-${id}`}
      className={cn(
        'card-interactive flex flex-col rounded-xl border border-border bg-card text-card-foreground overflow-hidden cursor-pointer',
        className
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
    >
      {/* Thumbnail — 16:9 gradient */}
      <div
        className={cn(
          'relative w-full aspect-video flex items-center justify-center',
          gradient
        )}
        data-testid={`course-card-thumbnail-${id}`}
        aria-hidden="true"
      >
        <span className="text-white/30 font-black text-5xl select-none">
          {getCategoryInitials(category)}
        </span>

        {featured && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5">
            <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
            FEATURED
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 font-semibold"
            data-category={category}
          >
            {category}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-card-foreground">
          {title}
        </h3>

        {/* Instructor */}
        <p className="text-xs text-muted-foreground truncate">{instructor}</p>

        <hr className="border-border" />

        {/* Progress bar — only when enrolled */}
        {enrolled && (
          <div
            className="w-full"
            aria-label={`Progress: ${clampedProgress}%`}
            data-testid={`course-card-progress-${id}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">
                Progress
              </span>
              <span className="text-[10px] text-primary font-semibold">
                {clampedProgress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <MasteryBadge level={mastery} size="sm" />
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            {lessonCount} lessons
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {estimatedHours}h
          </span>
        </div>

        <hr className="border-border" />

        {/* CTA */}
        <Button
          size="sm"
          variant={enrolled ? 'default' : 'outline'}
          className="w-full gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          aria-label={enrolled ? `Continue ${title}` : `Enroll in ${title}`}
        >
          {enrolled ? (
            <>
              Continue
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          ) : (
            'Enroll Free'
          )}
        </Button>
      </div>
    </article>
  );
}
