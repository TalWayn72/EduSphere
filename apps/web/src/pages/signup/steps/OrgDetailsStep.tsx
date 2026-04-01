/**
 * OrgDetailsStep — Step 2 of org signup wizard.
 * Collects org name, auto-slug with availability check, industry, size.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlugField } from './SlugField';
import type { OrgSignupFormData } from '../OrgSignupWizard.schema';

const ORG_TYPES = [
  'UNIVERSITY',
  'COLLEGE',
  'CORPORATE',
  'GOVERNMENT',
  'DEFENSE',
  'NON_PROFIT',
] as const;

const ORG_SIZES = ['1-50', '51-200', '201-1000', '1001-5000', '5000+'] as const;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

export function OrgDetailsStep() {
  const { t } = useTranslation('orgOnboarding');
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<OrgSignupFormData>();

  const orgName = watch('orgName');
  const slug = watch('slug');
  const [slugManual, setSlugManual] = useState(false);
  const [slugQuery, setSlugQuery] = useState('');

  useEffect(() => {
    if (!slugManual && orgName) {
      const generated = toSlug(orgName);
      setValue('slug', generated);
      setSlugQuery(generated);
    }
  }, [orgName, slugManual, setValue]);

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSlugManual(true);
      const val = toSlug(e.target.value);
      setValue('slug', val);
      setSlugQuery(val);
    },
    [setValue]
  );

  const handleSuggestionPick = useCallback(
    (s: string) => {
      setValue('slug', s);
      setSlugQuery(s);
    },
    [setValue]
  );

  return (
    <div className="space-y-5" data-testid="org-details-step">
      <div className="space-y-2">
        <Label htmlFor="orgName">{t('org.nameLabel')} *</Label>
        <Input
          id="orgName"
          {...register('orgName')}
          placeholder={t('org.namePlaceholder')}
          aria-required="true"
          aria-invalid={!!errors.orgName}
        />
        {errors.orgName && (
          <p className="text-destructive text-xs mt-1" role="alert">
            {errors.orgName.message}
          </p>
        )}
      </div>

      <SlugField
        slug={slug || ''}
        slugQuery={slugQuery}
        onChange={handleSlugChange}
        onSuggestionPick={handleSuggestionPick}
        error={errors.slug?.message}
        t={t}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orgType">{t('org.typeLabel')} *</Label>
          <Select onValueChange={(v) => setValue('orgType', v)} defaultValue="">
            <SelectTrigger id="orgType" aria-required="true">
              <SelectValue placeholder={t('org.typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {ORG_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`org.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.orgType && (
            <p className="text-destructive text-xs mt-1" role="alert">
              {errors.orgType.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="orgSize">{t('org.sizeLabel')}</Label>
          <Select onValueChange={(v) => setValue('orgSize', v)} defaultValue="">
            <SelectTrigger id="orgSize">
              <SelectValue placeholder={t('org.sizePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {ORG_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
