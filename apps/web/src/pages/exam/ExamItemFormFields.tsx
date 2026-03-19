/**
 * ExamItemFormFields — form fields for creating/editing an exam item.
 * Extracted to keep ExamItemEditorPage under 150 lines.
 */
import { type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label used directly in JSX via FormLabel
// import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import type { BloomLevel } from '@/types/exam';

const BLOOM_DESCRIPTIONS: Record<BloomLevel, string> = {
  REMEMBER: 'Recall facts and basic concepts',
  UNDERSTAND: 'Explain ideas or concepts',
  APPLY: 'Use information in new situations',
  ANALYZE: 'Draw connections among ideas',
  EVALUATE: 'Justify a stand or decision',
  CREATE: 'Produce new or original work',
};

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'DRAG_ORDER', label: 'Drag & Order' },
  { value: 'HOTSPOT', label: 'Hotspot' },
  { value: 'MATCHING', label: 'Matching' },
  { value: 'FILL_BLANK', label: 'Fill in the Blank' },
];

export interface ExamItemFormData {
  domain: string;
  bloomLevel: BloomLevel;
  questionType: 'MULTIPLE_CHOICE' | 'DRAG_ORDER' | 'HOTSPOT' | 'MATCHING' | 'FILL_BLANK';
  questionText: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ExamItemFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  bloomLevels: BloomLevel[];
  isEdit: boolean;
  onSubmit: (data: ExamItemFormData) => Promise<void>;
  onBack: () => void;
}

export function ExamItemFormFields({
  form, bloomLevels, isEdit, onSubmit, onBack,
}: ExamItemFormFieldsProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domain Tag</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Data Structures" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bloomLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bloom Level</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bloomLevels.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b} — {BLOOM_DESCRIPTIONS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="questionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {QUESTION_TYPES.map((qt) => (
                    <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="questionText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Question Text</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Enter the question..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty Hint</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="easy">Easy (IRT b ~ -1.0)</SelectItem>
                  <SelectItem value="medium">Medium (IRT b ~ 0.0)</SelectItem>
                  <SelectItem value="hard">Hard (IRT b ~ 1.5)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack}>Back</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Update Item' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
