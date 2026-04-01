/**
 * ExamItemReviewCard — card for reviewing AI-generated exam items.
 * Shows question, options, bloom/domain badges, and approve/edit/reject actions.
 */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BloomLevel } from '@/types/exam';
import type { QuizItem } from '@/types/quiz';

interface GeneratedItem {
  domainTag: string;
  bloomLevel: BloomLevel;
  questionData: QuizItem;
}

interface ExamItemReviewCardProps {
  item: GeneratedItem;
  index: number;
  onApprove: (index: number) => void;
  onEdit: (index: number) => void;
  onReject: (index: number) => void;
}

export function ExamItemReviewCard({
  item,
  index,
  onApprove,
  onEdit,
  onReject,
}: ExamItemReviewCardProps) {
  const qd = item.questionData;
  const questionText = 'question' in qd ? qd.question : '';

  return (
    <Card
      data-testid={`review-card-${index}`}
      className="border-l-4 border-l-blue-400"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium leading-snug">{questionText}</p>
          <div className="flex gap-1.5 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              {item.domainTag}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {item.bloomLevel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ReviewCardOptions questionData={qd} />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            {item.bloomLevel}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onReject(index)}>
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(index)}>
              Edit
            </Button>
            <Button size="sm" onClick={() => onApprove(index)}>
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Options display ──────────────────────────────────────────────────────────

function ReviewCardOptions({ questionData }: { questionData: QuizItem }) {
  if (questionData.type !== 'MULTIPLE_CHOICE') {
    return (
      <p className="text-xs text-muted-foreground italic">
        {questionData.type} — preview not available
      </p>
    );
  }
  const mc = questionData;
  return (
    <ul className="space-y-1">
      {mc.options.map((opt) => {
        const isCorrect = mc.correctOptionIds.includes(opt.id);
        return (
          <li
            key={opt.id}
            className={`text-sm px-2 py-1 rounded ${
              isCorrect
                ? 'bg-green-50 text-green-800 font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {isCorrect ? '✓ ' : '  '}
            {opt.text}
          </li>
        );
      })}
    </ul>
  );
}
