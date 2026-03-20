/**
 * BrandingSettingsPage.form.tsx — Form field components for BrandingSettingsPage.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface BrandingFormState {
  logoUrl: string;
  logoMarkUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  organizationName: string;
  tagline: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  supportEmail: string;
  hideEduSphereBranding: boolean;
}

interface Props {
  form: BrandingFormState;
  onChange: (field: keyof BrandingFormState, value: string | boolean) => void;
}

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Nunito',
  'System Default',
];

function ColorField({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: keyof BrandingFormState;
  value: string;
  onChange: (field: keyof BrandingFormState, value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className="h-8 w-12 rounded border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-28 border rounded px-2 py-1 text-sm font-mono"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export function BrandingIdentityCard({ form, onChange }: Props) {
  const { t } = useTranslation('admin');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branding.organizationIdentity')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {t('branding.organizationNameLabel')} <span className="text-destructive">{t('branding.organizationNameRequired')}</span>
          </label>
          <input
            type="text"
            value={form.organizationName}
            onChange={(e) => onChange('organizationName', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branding.taglineLabel')}</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => onChange('tagline', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('branding.taglinePlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branding.supportEmailLabel')}</label>
          <input
            type="email"
            value={form.supportEmail}
            onChange={(e) => onChange('supportEmail', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('branding.supportEmailPlaceholder')}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function BrandingLogosCard({ form, onChange }: Props) {
  const { t } = useTranslation('admin');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branding.logosFavicon')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branding.logoUrlLabel')}</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={form.logoUrl}
              onChange={(e) => onChange('logoUrl', e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder={t('branding.logoUrlPlaceholder')}
            />
            {form.logoUrl && (
              <img
                src={form.logoUrl}
                alt={t('branding.logoPreviewAlt')}
                className="h-8 max-w-[80px] object-contain rounded border"
              />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {t('branding.logoMarkUrlLabel')}{' '}
            <span className="text-muted-foreground text-xs">{t('branding.logoMarkUrlOptional')}</span>
          </label>
          <input
            type="text"
            value={form.logoMarkUrl}
            onChange={(e) => onChange('logoMarkUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('branding.logoMarkUrlPlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branding.faviconUrlLabel')}</label>
          <input
            type="text"
            value={form.faviconUrl}
            onChange={(e) => onChange('faviconUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('branding.faviconUrlPlaceholder')}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function BrandingColorsCard({ form, onChange }: Props) {
  const { t } = useTranslation('admin');
  const handleColor = (field: keyof BrandingFormState, value: string) =>
    onChange(field, value);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branding.colorsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <ColorField
          label={t('branding.primaryColor')}
          field="primaryColor"
          value={form.primaryColor}
          onChange={handleColor}
        />
        <ColorField
          label={t('branding.secondaryColor')}
          field="secondaryColor"
          value={form.secondaryColor}
          onChange={handleColor}
        />
        <ColorField
          label={t('branding.accentColor')}
          field="accentColor"
          value={form.accentColor}
          onChange={handleColor}
        />
        <ColorField
          label={t('branding.backgroundColor')}
          field="backgroundColor"
          value={form.backgroundColor}
          onChange={handleColor}
        />
      </CardContent>
    </Card>
  );
}

export function BrandingMiscCard({ form, onChange }: Props) {
  const { t } = useTranslation('admin');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branding.typographyTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branding.fontFamilyLabel')}</label>
          <select
            value={form.fontFamily}
            onChange={(e) => onChange('fontFamily', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm bg-background"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branding.privacyPolicyUrlLabel')}</label>
          <input
            type="text"
            value={form.privacyPolicyUrl}
            onChange={(e) => onChange('privacyPolicyUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('branding.privacyPolicyUrlPlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('branding.termsOfServiceUrlLabel')}</label>
          <input
            type="text"
            value={form.termsOfServiceUrl}
            onChange={(e) => onChange('termsOfServiceUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={t('branding.termsOfServiceUrlPlaceholder')}
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <input
            id="hide-branding"
            type="checkbox"
            checked={form.hideEduSphereBranding}
            onChange={(e) =>
              onChange('hideEduSphereBranding', e.target.checked)
            }
            className="h-4 w-4 rounded border"
          />
          <label
            htmlFor="hide-branding"
            className="text-sm font-medium cursor-pointer"
          >
            {t('branding.hideEduSphereBranding')}
          </label>
          <span className="text-xs text-muted-foreground">
            {t('branding.hideEduSphereBrandingDesc')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
