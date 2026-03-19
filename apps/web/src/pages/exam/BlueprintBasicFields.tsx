/**
 * BlueprintBasicFields — core form fields for an exam blueprint.
 */
import { type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
// Slider reserved for future weight distribution UI
// import { Slider } from '@/components/ui/slider';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BlueprintFormData } from './blueprint-schema';

interface BlueprintBasicFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  isEdit: boolean;
  onSubmit: (data: BlueprintFormData) => Promise<void>;
}

export function BlueprintBasicFields({ form, isEdit, onSubmit }: BlueprintBasicFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Basic Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            id="blueprint-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="Midterm Certification Exam" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Optional description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="totalItems" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Questions</FormLabel>
                  <FormControl>
                    <Input type="number" min={5} max={500} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="timeLimitMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Limit (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={5} max={480} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="passingMethod" render={({ field }) => (
                <FormItem>
                  <FormLabel>Passing Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="SCALED_SCORE">Scaled Score (0-1000)</SelectItem>
                      <SelectItem value="IRT_THETA">IRT Theta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="passingThreshold" render={({ field }) => (
                <FormItem>
                  <FormLabel>Passing Threshold</FormLabel>
                  <FormControl>
                    <Input type="number" {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {isEdit && (
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <Button type="submit" disabled={form.formState.isSubmitting} form="blueprint-form">
              {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Update Blueprint' : 'Create Blueprint'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
