/**
 * CourseEditMetadata — Basic Info tab for CourseEditPage.
 * Allows editing title, description, thumbnail (emoji/URL), and estimated hours.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { UPDATE_COURSE_MUTATION } from '@/lib/graphql/content.queries';

const metadataSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  estimatedHours: z.number().int().positive().optional(),
});

type MetadataValues = z.infer<typeof metadataSchema>;

interface Props {
  courseId: string;
  initialValues: {
    title: string;
    description: string;
    thumbnailUrl: string;
    estimatedHours?: number;
  };
  onSaved: (message: string) => void;
}

interface UpdateCourseResult {
  updateCourse: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    estimatedHours: number | null;
  };
}

export function CourseEditMetadata({
  courseId,
  initialValues,
  onSaved,
}: Props) {
  const [{ fetching }, executeUpdate] = useMutation<UpdateCourseResult>(
    UPDATE_COURSE_MUTATION
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<MetadataValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(metadataSchema as any),
    defaultValues: {
      title: initialValues.title,
      description: initialValues.description,
      thumbnailUrl: initialValues.thumbnailUrl,
      estimatedHours: initialValues.estimatedHours,
    },
  });

  const onSubmit = async (values: MetadataValues) => {
    const input: Record<string, unknown> = {};
    if (values.title !== initialValues.title) input.title = values.title;
    if (values.description !== initialValues.description)
      input.description = values.description ?? '';
    if (values.thumbnailUrl !== initialValues.thumbnailUrl)
      input.thumbnailUrl = values.thumbnailUrl ?? '';
    if (values.estimatedHours !== initialValues.estimatedHours)
      input.estimatedHours = values.estimatedHours ?? null;

    const { error } = await executeUpdate({ id: courseId, input });
    if (error) {
      onSaved(
        `Save failed: ${error.graphQLErrors?.[0]?.message ?? error.message}`
      );
    } else {
      onSaved('Course info saved!');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Course Title *</Label>
            <Input
              id="edit-title"
              {...register('title')}
              placeholder="Enter course title"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              {...register('description')}
              placeholder="Describe what students will learn"
              rows={4}
            />
          </div>

          {/* Thumbnail */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-thumbnail">Thumbnail (emoji or URL)</Label>
            <Input
              id="edit-thumbnail"
              {...register('thumbnailUrl')}
              placeholder="e.g. 📚 or https://..."
            />
          </div>

          {/* Estimated hours */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-hours">Estimated Hours</Label>
            <Input
              id="edit-hours"
              type="number"
              min={1}
              {...register('estimatedHours', { valueAsNumber: true })}
              placeholder="e.g. 8"
              className="w-32"
            />
          </div>

          <Button
            type="submit"
            disabled={fetching || !isDirty}
            className="gap-2"
          >
            {fetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
