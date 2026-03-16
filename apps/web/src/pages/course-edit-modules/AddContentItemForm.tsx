/**
 * Inline form for adding a content item to a module.
 */
import { useState } from 'react';
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
      <p className="text-xs font-medium">Add Content Item</p>
      <Input
        placeholder="Title *"
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
          {CONTENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {TYPE_EMOJI[t]} {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Body text / URL (optional)"
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
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
