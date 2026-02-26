/**
 * SRSReviewSession — inline card-flip review UI component.
 * Shown when the user clicks "Start Review" in the SRS Dashboard widget.
 */
import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { SUBMIT_REVIEW_MUTATION } from '@/lib/graphql/srs.queries';

interface SRSCard {
  id: string;
  conceptName: string;
}

interface Props {
  cards: SRSCard[];
  onComplete: () => void;
}

interface SubmitReviewResult {
  submitReview: { id: string };
}

const QUALITY_BUTTONS: {
  label: string;
  quality: number;
  variant: 'destructive' | 'outline' | 'secondary' | 'default';
}[] = [
  { label: 'Again', quality: 1, variant: 'destructive' },
  { label: 'Hard', quality: 3, variant: 'outline' },
  { label: 'Good', quality: 4, variant: 'secondary' },
  { label: 'Easy', quality: 5, variant: 'default' },
];

export function SRSReviewSession({ cards, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [, submitReview] = useMutation<SubmitReviewResult>(
    SUBMIT_REVIEW_MUTATION
  );

  const card = cards[index];

  if (!card) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-2xl">All caught up!</p>
        <p className="text-muted-foreground text-sm">
          Great work — come back tomorrow.
        </p>
        <Button onClick={onComplete} variant="outline" size="sm">
          Close
        </Button>
      </div>
    );
  }

  const handleQuality = async (quality: number) => {
    await submitReview({ cardId: card.id, quality });
    setFlipped(false);
    if (index + 1 >= cards.length) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-right">
        {index + 1} / {cards.length}
      </p>

      <div
        onClick={() => setFlipped(true)}
        className="min-h-[120px] rounded-lg border bg-muted/30 flex items-center justify-center cursor-pointer p-6 hover:bg-muted/50 transition-colors"
        role="button"
        aria-label={flipped ? 'Card revealed' : 'Click to reveal concept'}
      >
        <p className="text-center font-semibold text-lg">
          {flipped ? card.conceptName : '?  Click to reveal  ?'}
        </p>
      </div>

      {flipped && (
        <div className="flex gap-2 flex-wrap justify-center">
          {QUALITY_BUTTONS.map(({ label, quality, variant }) => (
            <Button
              key={quality}
              variant={variant}
              size="sm"
              onClick={() => void handleQuality(quality)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {!flipped && (
        <p className="text-xs text-center text-muted-foreground">
          Think of the answer, then click the card to reveal it.
        </p>
      )}
    </div>
  );
}
