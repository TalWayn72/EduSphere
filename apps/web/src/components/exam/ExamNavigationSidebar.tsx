import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Props {
  totalQuestions: number;
  currentIndex: number;
  answeredIds: Set<string>;
  flaggedIds: Set<string>;
  questionItemIds: string[];
  onGoTo: (index: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function Legend() {
  const items = [
    { color: 'bg-muted text-muted-foreground', label: 'Unanswered' },
    { color: 'bg-green-500 text-white', label: 'Answered' },
    { color: 'bg-orange-500 text-white', label: 'Flagged' },
    { color: 'ring-2 ring-primary', label: 'Current' },
  ];

  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className={cn('h-3 w-3 rounded-sm border', it.color)} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

export function ExamNavigationSidebar({
  totalQuestions,
  currentIndex,
  answeredIds,
  flaggedIds,
  questionItemIds,
  onGoTo,
  onSubmit,
  isSubmitting,
}: Props) {
  return (
    <div className="flex flex-col h-full gap-4">
      <h3 className="text-sm font-semibold">Questions</h3>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: totalQuestions }, (_, i) => {
            const itemId = questionItemIds[i] ?? '';
            const isCurrent = i === currentIndex;
            const isAnswered = answeredIds.has(itemId);
            const isFlagged = flaggedIds.has(itemId);

            return (
              <button
                key={i}
                type="button"
                onClick={() => onGoTo(i)}
                aria-label={`Question ${i + 1}${isFlagged ? ' (flagged)' : ''}${isAnswered ? ' (answered)' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'h-8 w-8 rounded text-xs font-medium transition-colors',
                  'flex items-center justify-center',
                  !isAnswered && !isFlagged && 'bg-muted text-muted-foreground',
                  isAnswered && !isFlagged && 'bg-green-500 text-white',
                  isFlagged && 'bg-orange-500 text-white',
                  isCurrent && 'ring-2 ring-primary ring-offset-1',
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <Legend />

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full"
        variant="destructive"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Exam'}
      </Button>
    </div>
  );
}
