/**
 * WebhookForm — Extracted create-webhook form from WebhooksPage.
 */
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EVENTS = [
  'user.created',
  'user.updated',
  'course.completed',
  'enrollment.created',
  'badge.earned',
  'subscription.changed',
] as const;

const webhookSchema = z.object({
  url: z
    .string()
    .url('Must be a valid HTTPS URL')
    .startsWith('https://', 'URL must use HTTPS'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
});

export type WebhookFormData = z.infer<typeof webhookSchema>;

interface WebhookFormProps {
  t: (key: string) => string;
  onSubmit: (data: WebhookFormData) => Promise<void>;
}

export function WebhookForm({ t, onSubmit }: WebhookFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { events: [] },
  });

  const selectedEvents = watch('events') ?? [];

  const toggleEvent = (event: string) => {
    const next = selectedEvents.includes(event)
      ? selectedEvents.filter((e) => e !== event)
      : [...selectedEvents, event];
    setValue('events', next);
  };

  const handleCreate = async (d: WebhookFormData) => {
    await onSubmit(d);
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('webhooks.createTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(handleCreate)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="webhook-url">{t('webhooks.urlLabel')}</Label>
            <Input
              id="webhook-url"
              {...register('url')}
              placeholder="https://your-app.com/webhooks"
              aria-required="true"
            />
            {errors.url && (
              <p className="text-destructive text-xs" role="alert">
                {errors.url.message}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium mb-2">
              {t('webhooks.eventsLabel')}
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENTS.map((event) => (
                <div key={event} className="flex items-center gap-2">
                  <Checkbox
                    id={`event-${event}`}
                    checked={selectedEvents.includes(event)}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <Label htmlFor={`event-${event}`} className="text-xs">
                    {event}
                  </Label>
                </div>
              ))}
            </div>
            {errors.events && (
              <p className="text-destructive text-xs mt-1" role="alert">
                {errors.events.message}
              </p>
            )}
          </fieldset>

          <Button type="submit">{t('webhooks.create')}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
