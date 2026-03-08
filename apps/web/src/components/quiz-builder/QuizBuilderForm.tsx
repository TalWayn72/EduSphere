/**
 * QuizBuilderForm — Manages the list of questions and passing-score slider.
 * Renders a QuizQuestion per item plus "Add Question" and passing-score controls.
 */
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { PlusCircle } from 'lucide-react';
import { QuizQuestion, type QuizQuestionItem } from './QuizQuestion';

interface QuizBuilderFormProps {
  questions: QuizQuestionItem[];
  passingScore: number;
  onChange: (questions: QuizQuestionItem[], passingScore: number) => void;
}

function makeEmptyQuestion(): QuizQuestionItem {
  return {
    type: 'MULTIPLE_CHOICE',
    question: '',
    choices: ['', '', '', ''],
    correctIndex: 0,
  };
}

export function QuizBuilderForm({ questions, passingScore, onChange }: QuizBuilderFormProps) {
  const handleAdd = () => {
    onChange([...questions, makeEmptyQuestion()], passingScore);
  };

  const handleChange = (index: number, updated: QuizQuestionItem) => {
    const next = questions.map((q, i) => (i === index ? updated : q));
    onChange(next, passingScore);
  };

  const handleRemove = (index: number) => {
    const next = questions.filter((_, i) => i !== index);
    onChange(next, passingScore);
  };

  const handlePassingScore = (value: number[]) => {
    onChange(questions, value[0] ?? passingScore);
  };

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No questions yet. Click &quot;Add Question&quot; to begin.
        </p>
      )}

      {questions.map((q, i) => (
        <QuizQuestion
          key={i}
          index={i}
          question={q}
          onChange={(updated) => handleChange(i, updated)}
          onRemove={() => handleRemove(i)}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={handleAdd}
        className="w-full"
        aria-label="Add question"
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Question
      </Button>

      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="passing-score" className="text-sm font-medium">
            Passing Score
          </Label>
          <span className="text-sm font-semibold text-primary" aria-live="polite">
            {passingScore}%
          </span>
        </div>
        <Slider
          id="passing-score"
          min={0}
          max={100}
          step={5}
          value={[passingScore]}
          onValueChange={handlePassingScore}
          aria-label="Passing score percentage"
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Learners must score at least {passingScore}% to pass.
        </p>
      </div>
    </div>
  );
}
