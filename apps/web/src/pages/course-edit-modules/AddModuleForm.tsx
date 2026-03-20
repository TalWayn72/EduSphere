/**
 * Card form for creating a new module, with toggle button.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import type { NewModuleForm } from './types';

interface AddModuleFormProps {
  onSubmit: (form: NewModuleForm) => Promise<boolean>;
}

export function AddModuleForm({ onSubmit }: AddModuleFormProps) {
  const { t } = useTranslation('courses');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewModuleForm>({
    title: '',
    description: '',
  });

  const handleSubmit = async () => {
    const success = await onSubmit(form);
    if (success) {
      setForm({ title: '', description: '' });
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed"
        onClick={() => setShowForm(true)}
      >
        <Plus className="h-4 w-4" />
        {t('addModule')}
      </Button>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-4 space-y-3">
        <p className="text-sm font-medium">{t('newModule')}</p>
        <Input
          placeholder={t('moduleTitlePlaceholder')}
          value={form.title}
          onChange={(e) =>
            setForm((f) => ({ ...f, title: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') setShowForm(false);
          }}
          autoFocus
        />
        <Input
          placeholder={t('moduleDescriptionPlaceholder')}
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!form.title.trim()}
          >
            {t('createModule')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowForm(false);
              setForm({ title: '', description: '' });
            }}
          >
            {t('cancel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
