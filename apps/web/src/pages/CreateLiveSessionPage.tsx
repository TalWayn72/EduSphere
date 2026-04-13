/**
 * CreateLiveSessionPage — instructor form to create a new live stream session.
 *
 * Form fields:
 * - title (required)
 * - scheduledAt (date+time picker, optional)
 * - streamType (BROADCAST | INTERACTIVE | RECORDED_PLAYBACK)
 * - streamUrl (optional URL override)
 * - maxViewers (optional positive integer)
 * - autoRecord toggle (UI preference)
 *
 * On success → navigate to /courses/:courseId
 * Route: /courses/:courseId/live/new
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CREATE_LIVE_STREAM_MUTATION } from '@/lib/graphql/live-stream-session.queries';
import { cn } from '@/lib/utils';

// ── Zod schema ─────────────────────────────────────────────────────────────────

const STREAM_TYPES = ['BROADCAST', 'INTERACTIVE', 'RECORDED_PLAYBACK'] as const;

const schema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title too long'),
  scheduledAt: z.string().optional(),
  streamType: z.enum(STREAM_TYPES),
  streamUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  maxViewersRaw: z.string().optional(),
  autoRecord: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateLiveSessionPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const [, executeCreate] = useMutation(CREATE_LIVE_STREAM_MUTATION);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      scheduledAt: '',
      streamType: 'BROADCAST',
      streamUrl: '',
      maxViewersRaw: '',
      autoRecord: false,
    },
  });

  const autoRecord = watch('autoRecord');
  const streamType = watch('streamType');

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const maxViewers = values.maxViewersRaw
      ? parseInt(values.maxViewersRaw, 10)
      : undefined;

    if (maxViewers !== undefined && (isNaN(maxViewers) || maxViewers <= 0)) {
      setServerError('Max viewers must be a positive integer.');
      return;
    }

    const result = await executeCreate({
      courseId,
      title: values.title,
      scheduledAt: values.scheduledAt || undefined,
      streamType: values.streamType,
      maxViewers,
    });

    if (result.error) {
      setServerError(result.error.message);
      return;
    }

    navigate(`/courses/${courseId}`);
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" dir="auto">
          שידור חי חדש
        </h1>

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-5"
          noValidate
        >
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" dir="auto">
              כותרת השידור{' '}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="לדוגמה: הרצאה 3 — אלגוריתמי חיפוש"
              dir="auto"
              aria-describedby={errors.title ? 'title-error' : undefined}
              className={cn(errors.title && 'border-destructive')}
              data-testid="input-title"
            />
            {errors.title && (
              <p
                id="title-error"
                className="text-xs text-destructive"
                role="alert"
                dir="auto"
              >
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Scheduled at */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt" dir="auto">
              תאריך ושעה (אופציונלי)
            </Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              {...register('scheduledAt')}
              className="w-full"
              data-testid="input-scheduled-at"
            />
          </div>

          {/* Stream type */}
          <div className="space-y-1.5">
            <Label dir="auto">סוג שידור</Label>
            <Select
              value={streamType}
              onValueChange={(v) =>
                setValue('streamType', v as (typeof STREAM_TYPES)[number])
              }
            >
              <SelectTrigger data-testid="stream-type-select">
                <SelectValue placeholder="בחר סוג שידור" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BROADCAST">Broadcast (HLS)</SelectItem>
                <SelectItem value="INTERACTIVE">
                  Interactive (LiveKit)
                </SelectItem>
                <SelectItem value="RECORDED_PLAYBACK">
                  Recorded Playback
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stream URL override */}
          <div className="space-y-1.5">
            <Label htmlFor="streamUrl" dir="auto">
              כתובת שידור — override (אופציונלי)
            </Label>
            <Input
              id="streamUrl"
              {...register('streamUrl')}
              type="url"
              placeholder="https://..."
              dir="ltr"
              aria-describedby={errors.streamUrl ? 'stream-url-error' : undefined}
              className={cn(errors.streamUrl && 'border-destructive')}
              data-testid="input-stream-url"
            />
            {errors.streamUrl && (
              <p
                id="stream-url-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.streamUrl.message}
              </p>
            )}
          </div>

          {/* Max viewers */}
          <div className="space-y-1.5">
            <Label htmlFor="maxViewers" dir="auto">
              מקסימום צופים (אופציונלי)
            </Label>
            <Input
              id="maxViewers"
              {...register('maxViewersRaw')}
              type="number"
              min={1}
              placeholder="ללא הגבלה"
              data-testid="input-max-viewers"
            />
          </div>

          {/* Auto-record toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label
                htmlFor="autoRecord"
                dir="auto"
                className="cursor-pointer"
              >
                הקלטה אוטומטית
              </Label>
              <p className="text-xs text-muted-foreground" dir="auto">
                הקלט את השידור אוטומטית לארכיון
              </p>
            </div>
            <Switch
              id="autoRecord"
              checked={autoRecord}
              onCheckedChange={(v) => setValue('autoRecord', v)}
              data-testid="auto-record-switch"
            />
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-sm text-destructive" role="alert" dir="auto">
              {serverError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="submit-create-session"
            >
              {isSubmitting ? 'יוצר…' : 'צור שידור'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/courses/${courseId}`)}
              disabled={isSubmitting}
            >
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
