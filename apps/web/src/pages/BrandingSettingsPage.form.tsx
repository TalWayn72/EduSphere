/**
 * BrandingSettingsPage.form.tsx — Form field components for BrandingSettingsPage.
 */
import React from 'react';
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Organization Name <span className="text-destructive">*</span>
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
          <label className="text-sm font-medium">Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => onChange('tagline', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Your learning platform tagline"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Support Email</label>
          <input
            type="email"
            value={form.supportEmail}
            onChange={(e) => onChange('supportEmail', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="support@example.com"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function BrandingLogosCard({ form, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logos &amp; Favicon</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Logo URL</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={form.logoUrl}
              onChange={(e) => onChange('logoUrl', e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="https://..."
            />
            {form.logoUrl && (
              <img
                src={form.logoUrl}
                alt="Logo preview"
                className="h-8 max-w-[80px] object-contain rounded border"
              />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Logo Mark URL{' '}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <input
            type="text"
            value={form.logoMarkUrl}
            onChange={(e) => onChange('logoMarkUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://... (square icon version)"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Favicon URL</label>
          <input
            type="text"
            value={form.faviconUrl}
            onChange={(e) => onChange('faviconUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function BrandingColorsCard({ form, onChange }: Props) {
  const handleColor = (field: keyof BrandingFormState, value: string) =>
    onChange(field, value);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Colors</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <ColorField
          label="Primary Color"
          field="primaryColor"
          value={form.primaryColor}
          onChange={handleColor}
        />
        <ColorField
          label="Secondary Color"
          field="secondaryColor"
          value={form.secondaryColor}
          onChange={handleColor}
        />
        <ColorField
          label="Accent Color"
          field="accentColor"
          value={form.accentColor}
          onChange={handleColor}
        />
        <ColorField
          label="Background Color"
          field="backgroundColor"
          value={form.backgroundColor}
          onChange={handleColor}
        />
      </CardContent>
    </Card>
  );
}

export function BrandingMiscCard({ form, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Typography, Policies &amp; Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Font Family</label>
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
          <label className="text-sm font-medium">Privacy Policy URL</label>
          <input
            type="text"
            value={form.privacyPolicyUrl}
            onChange={(e) => onChange('privacyPolicyUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Terms of Service URL</label>
          <input
            type="text"
            value={form.termsOfServiceUrl}
            onChange={(e) => onChange('termsOfServiceUrl', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://..."
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
            Hide EduSphere Branding
          </label>
          <span className="text-xs text-muted-foreground">
            Remove "Powered by EduSphere" footer
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
