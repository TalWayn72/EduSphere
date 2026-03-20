/**
 * Inline form for adding a content item to a module.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTENT_TYPES, type ContentType, type NewItemForm } from './types';
import { TYPE_EMOJI } from './utils';

interface AddContentItemFormProps {
  moduleId: string;
  onSubmit: (moduleId: string, form: NewItemForm) => Promise<boolean>;
  onCancel: () => void;
}

export function AddContentItemForm({
  moduleId,
  onSubmit,
  onCancel,
}: AddContentItemFormProps) {
  const { t } = useTranslation('courses');
  const [form, setForm] = useState<NewItemForm>({
    title: '',
    contentType: 'MARKDOWN',
    body: '',
  });

  const handleSubmit = async () => {
    const success = await onSubmit(moduleId, form);
    if (success) {
      setForm({ title: '', contentType: 'MARKDOWN', body: '' });
      onCancel();
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <p className="text-xs font-medium">{t('addContentItem')}</p>
      <Input
        placeholder={t('contentItemTitle')}
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        className="h-8 text-sm"
      />
      <Select
        value={form.contentType}
        onValueChange={(v) =>
          setForm((f) => ({ ...f, contentType: v as ContentType }))
        }
      >
        <SelectTrigger className="h-8 text-sm" aria-label="Content type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONTENT_TYPES.map((ct) => (
            <SelectItem key={ct} value={ct}>
              {TYPE_EMOJI[ct]} {ct}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder={t('contentItemBodyPlaceholder')}
        value={form.body}
        onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        className="h-8 text-sm"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!form.title.trim()}
        >
          {t('add')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
