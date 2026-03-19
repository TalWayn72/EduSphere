import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  formattedTime: string;
  isWarning: boolean;
  isCritical: boolean;
  timeRemaining: number;
}

export function ExamTimer({
  formattedTime,
  isWarning,
  isCritical,
  timeRemaining,
}: Props) {
  const isFlashing = timeRemaining <= 60 && timeRemaining > 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 px-3 py-1.5 text-sm font-mono tabular-nums transition-colors',
        !isWarning && !isCritical && 'border-green-500 bg-green-50 text-green-700',
        isWarning && 'border-yellow-500 bg-yellow-50 text-yellow-700',
        isCritical && 'border-red-500 bg-red-50 text-red-700',
        isFlashing && 'animate-pulse',
      )}
      aria-live="polite"
      aria-label={`Time remaining: ${formattedTime}`}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {formattedTime}
    </Badge>
  );
}
