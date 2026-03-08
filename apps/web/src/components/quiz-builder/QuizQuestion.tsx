/**
 * QuizQuestion — Single question editor for the Quiz Builder.
 * Renders question text, 4 choice inputs, correct-answer radio, and a remove button.
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

export interface QuizQuestionItem {
  type: 'MULTIPLE_CHOICE';
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
}

interface QuizQuestionProps {
  index: number;
  question: QuizQuestionItem;
  onChange: (q: QuizQuestionItem) => void;
  onRemove: () => void;
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;

export function QuizQuestion({ index, question, onChange, onRemove }: QuizQuestionProps) {
  const handleQuestionText = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...question, question: e.target.value });
  };

  const handleChoice = (ci: number, value: string) => {
    const choices = [...question.choices] as [string, string, string, string];
    choices[ci] = value;
    onChange({ ...question, choices });
  };

  const handleCorrect = (ci: number) => {
    onChange({ ...question, correctIndex: ci });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Question {index + 1}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove question ${index + 1}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>

      <Input
        placeholder="Enter question text"
        value={question.question}
        onChange={handleQuestionText}
        aria-label={`Question ${index + 1} text`}
      />

      <div className="space-y-2">
        {question.choices.map((choice, ci) => (
          <div key={ci} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${index}`}
              checked={question.correctIndex === ci}
              onChange={() => handleCorrect(ci)}
              aria-label={`Mark choice ${CHOICE_LABELS[ci]} as correct`}
              className="h-4 w-4 accent-primary"
            />
            <Label className="w-5 text-muted-foreground">{CHOICE_LABELS[ci]}</Label>
            <Input
              placeholder={`Choice ${CHOICE_LABELS[ci]}`}
              value={choice}
              onChange={(e) => handleChoice(ci, e.target.value)}
              aria-label={`Choice ${CHOICE_LABELS[ci]} for question ${index + 1}`}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
