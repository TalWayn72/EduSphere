/**
 * AccountStep — Step 1 of org signup wizard.
 * Collects admin name, email, password, ToS + GDPR consent.
 */
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { OrgSignupFormData } from '../OrgSignupWizard.schema';

export function AccountStep() {
  const { t } = useTranslation('orgOnboarding');
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<OrgSignupFormData>();

  const tosAccepted = watch('tosAccepted');
  const gdprConsent = watch('gdprConsent');

  return (
    <div className="space-y-5" data-testid="account-step">
      <div className="space-y-2">
        <Label htmlFor="adminName">{t('account.nameLabel')} *</Label>
        <Input
          id="adminName"
          {...register('adminName')}
          placeholder={t('account.namePlaceholder')}
          aria-required="true"
          aria-invalid={!!errors.adminName}
        />
        {errors.adminName && (
          <p className="text-destructive text-xs mt-1" role="alert">
            {errors.adminName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">{t('account.emailLabel')} *</Label>
        <Input
          id="adminEmail"
          type="email"
          {...register('adminEmail')}
          placeholder={t('account.emailPlaceholder')}
          aria-required="true"
          aria-invalid={!!errors.adminEmail}
          autoComplete="email"
        />
        {errors.adminEmail && (
          <p className="text-destructive text-xs mt-1" role="alert">
            {errors.adminEmail.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('account.passwordLabel')} *</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder={t('account.passwordPlaceholder')}
          aria-required="true"
          aria-invalid={!!errors.password}
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-destructive text-xs mt-1" role="alert">
            {errors.password.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t('account.passwordHint')}
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id="tosAccepted"
            checked={tosAccepted === true}
            onCheckedChange={(v) => setValue('tosAccepted', (v === true) as true)}
            aria-required="true"
          />
          <Label htmlFor="tosAccepted" className="text-sm leading-snug">
            {t('account.tosLabel')}{' '}
            <a href="/terms" target="_blank" className="underline text-primary">
              {t('account.tosLink')}
            </a>
          </Label>
        </div>
        {errors.tosAccepted && (
          <p className="text-destructive text-xs" role="alert">
            {errors.tosAccepted.message}
          </p>
        )}

        <div className="flex items-start gap-2">
          <Checkbox
            id="gdprConsent"
            checked={gdprConsent === true}
            onCheckedChange={(v) => setValue('gdprConsent', v === true)}
          />
          <Label htmlFor="gdprConsent" className="text-sm leading-snug">
            {t('account.gdprLabel')}
          </Label>
        </div>
      </div>
    </div>
  );
}
