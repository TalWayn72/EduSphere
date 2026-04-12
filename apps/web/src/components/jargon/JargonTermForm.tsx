/**
 * JargonTermForm — Create a new jargon term with tag-style alt-forms input.
 */
import React, { useState, KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ADD_JARGON_TERM_MUTATION } from '@/lib/graphql/jargon.queries';

const termSchema = z.object({
  canonicalForm: z.string().min(1, 'Canonical form is required'),
  phoneticHint: z.string().optional(),
  definitionShort: z.string().min(1, 'Definition is required'),
  language: z.string().min(2, 'Language is required'),
});

type TermFormValues = z.infer<typeof termSchema>;

interface Props {
  domainId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function JargonTermForm({ domainId, onSave, onCancel }: Props) {
  const { t } = useTranslation('admin');
  const [altForms, setAltForms] = useState<string[]>([]);
  const [altInput, setAltInput] = useState('');

  const [{ fetching: adding }, execAdd] = useMutation(ADD_JARGON_TERM_MUTATION);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TermFormValues>({
    resolver: zodResolver(termSchema),
    defaultValues: {
      canonicalForm: '',
      phoneticHint: '',
      definitionShort: '',
      language: 'en',
    },
  });

  function addAltForm() {
    const val = altInput.trim();
    if (val && !altForms.includes(val)) {
      setAltForms((prev) => [...prev, val]);
    }
    setAltInput('');
  }

  function removeAltForm(form: string) {
    setAltForms((prev) => prev.filter((f) => f !== form));
  }

  function handleAltKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAltForm();
    }
  }

  async function onSubmit(values: TermFormValues) {
    await execAdd({
      input: {
        domainId,
        canonicalForm: values.canonicalForm,
        phoneticHint: values.phoneticHint || undefined,
        altForms,
        definitionShort: values.definitionShort,
        language: values.language,
      },
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="canonicalForm">
          {t('jargon.termForm.canonicalForm', 'Canonical Form')}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="canonicalForm"
          {...register('canonicalForm')}
          className="mt-1"
        />
        {errors.canonicalForm && (
          <p className="text-xs text-destructive mt-1">
            {errors.canonicalForm.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="phoneticHint">
          {t('jargon.termForm.phoneticHint', 'Phonetic Hint')}
        </Label>
        <Input
          id="phoneticHint"
          placeholder={t(
            'jargon.termForm.phoneticHintPlaceholder',
            'e.g. /ˈɛɡ.zəm.pəl/'
          )}
          {...register('phoneticHint')}
          className="mt-1"
        />
      </div>

      <div>
        <Label>{t('jargon.termForm.altForms', 'Alternative Forms')}</Label>
        <div className="flex flex-wrap gap-1 mt-1 mb-1">
          {altForms.map((f) => (
            <Badge key={f} variant="secondary" className="gap-1">
              {f}
              <button
                type="button"
                onClick={() => removeAltForm(f)}
                className="hover:text-destructive"
                aria-label={t(
                  'jargon.termForm.removeAltForm',
                  'Remove {{form}}',
                  { form: f }
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={altInput}
            onChange={(e) => setAltInput(e.target.value)}
            onKeyDown={handleAltKeyDown}
            placeholder={t(
              'jargon.termForm.altFormsPlaceholder',
              'Type and press Enter...'
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAltForm}
          >
            {t('jargon.termForm.add', 'Add')}
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="definitionShort">
          {t('jargon.termForm.definition', 'Short Definition')}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <textarea
          id="definitionShort"
          {...register('definitionShort')}
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          placeholder={t(
            'jargon.termForm.definitionPlaceholder',
            'Brief definition of the term...'
          )}
        />
        {errors.definitionShort && (
          <p className="text-xs text-destructive mt-1">
            {errors.definitionShort.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="language">
          {t('jargon.termForm.language', 'Language')}
        </Label>
        <Input id="language" {...register('language')} className="mt-1" />
        {errors.language && (
          <p className="text-xs text-destructive mt-1">
            {errors.language.message}
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={adding}>
          {adding
            ? t('jargon.termForm.saving', 'Saving...')
            : t('jargon.termForm.save', 'Save Term')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('jargon.termForm.cancel', 'Cancel')}
        </Button>
      </div>
    </form>
  );
}
