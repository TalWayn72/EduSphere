/**
 * BrandingStep — Step 3 of org signup wizard.
 * Logo upload, color picker, tagline, live preview.
 */
import React, { useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { OrgSignupFormData } from '../OrgSignupWizard.schema';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

interface BrandingPreviewProps {
  orgName: string;
  primaryColor: string;
  logoPreview: string | null;
  tagline: string;
}

function BrandingPreview({ orgName, primaryColor, logoPreview, tagline }: BrandingPreviewProps) {
  const { t } = useTranslation('orgOnboarding');
  return (
    <Card className="border-dashed" data-testid="branding-preview">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-2">{t('branding.previewLabel')}</p>
        <div
          className="rounded-lg p-4 text-white flex items-center gap-3"
          style={{ backgroundColor: primaryColor || '#2563eb' }}
        >
          {logoPreview ? (
            <img src={logoPreview} alt="" className="h-8 w-8 rounded object-contain bg-white/20" />
          ) : (
            <div className="h-8 w-8 rounded bg-white/20" />
          )}
          <div>
            <p className="font-semibold text-sm">{orgName || t('branding.previewOrgName')}</p>
            {tagline && <p className="text-xs opacity-80">{tagline}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BrandingStep() {
  const { t } = useTranslation('orgOnboarding');
  const {
    register, formState: { errors }, setValue, watch,
  } = useFormContext<OrgSignupFormData>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const orgName = watch('orgName');
  const primaryColor = watch('primaryColor');
  const tagline = watch('tagline');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setLogoError(t('branding.invalidType'));
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(t('branding.tooLarge'));
      return;
    }

    setValue('logoFile', file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5" data-testid="branding-step">
      <BrandingPreview
        orgName={orgName}
        primaryColor={primaryColor || '#2563eb'}
        logoPreview={logoPreview}
        tagline={tagline || ''}
      />

      <div className="space-y-2">
        <Label htmlFor="logoFile">{t('branding.logoLabel')}</Label>
        <Input
          id="logoFile"
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleLogoChange}
          aria-describedby="logo-hint"
        />
        <p id="logo-hint" className="text-xs text-muted-foreground">
          {t('branding.logoHint')}
        </p>
        {logoError && (
          <p className="text-destructive text-xs" role="alert">{logoError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">{t('branding.primaryColorLabel')}</Label>
          <div className="flex items-center gap-2">
            <input
              id="primaryColor"
              type="color"
              value={primaryColor || '#2563eb'}
              onChange={(e) => setValue('primaryColor', e.target.value)}
              className="h-9 w-12 rounded border cursor-pointer"
              aria-label={t('branding.primaryColorLabel')}
            />
            <Input
              value={primaryColor || '#2563eb'}
              onChange={(e) => setValue('primaryColor', e.target.value)}
              placeholder="#2563eb"
              className="flex-1"
              maxLength={7}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">{t('branding.taglineLabel')}</Label>
          <Input
            id="tagline"
            {...register('tagline')}
            placeholder={t('branding.taglinePlaceholder')}
            maxLength={120}
          />
        </div>
      </div>

      {errors.primaryColor && (
        <p className="text-destructive text-xs" role="alert">
          {errors.primaryColor.message}
        </p>
      )}
    </div>
  );
}
