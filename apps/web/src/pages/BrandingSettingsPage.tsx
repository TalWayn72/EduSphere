/**
 * BrandingSettingsPage - Tenant branding customization.
 * Route: /admin/branding
 * Access: ORG_ADMIN, SUPER_ADMIN only
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';
import { Paintbrush, Loader2, CheckCircle2 } from 'lucide-react';
import {
  TENANT_BRANDING_QUERY,
  UPDATE_TENANT_BRANDING_MUTATION,
} from '@/lib/graphql/branding.queries';
import {
  type BrandingFormState,
  BrandingIdentityCard,
  BrandingLogosCard,
  BrandingColorsCard,
  BrandingMiscCard,
} from './BrandingSettingsPage.form';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

const DEFAULT_FORM: BrandingFormState = {
  logoUrl: '',
  logoMarkUrl: '',
  faviconUrl: '',
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  accentColor: '#06b6d4',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  organizationName: '',
  tagline: '',
  privacyPolicyUrl: '',
  termsOfServiceUrl: '',
  supportEmail: '',
  hideEduSphereBranding: false,
};

interface BrandingQueryResult {
  myTenantBranding: BrandingFormState | null;
}

export function BrandingSettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [form, setForm] = useState<BrandingFormState>(DEFAULT_FORM);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [queryResult] = useQuery<BrandingQueryResult>({
    query: TENANT_BRANDING_QUERY,
  });
  const [mutResult, updateBranding] = useMutation(
    UPDATE_TENANT_BRANDING_MUTATION
  );

  useEffect(() => {
    if (queryResult.data?.myTenantBranding) {
      setForm({ ...DEFAULT_FORM, ...queryResult.data.myTenantBranding });
    }
  }, [queryResult.data]);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const handleChange = (
    field: keyof BrandingFormState,
    value: string | boolean
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaveError(null);
    const result = await updateBranding({ input: form });
    if (result.error) {
      setSaveError(result.error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Paintbrush className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Branding Settings</h1>
            <p className="text-muted-foreground text-sm">
              Customize your organization's look and feel
            </p>
          </div>
        </div>

        {queryResult.fetching ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading branding
            settings...
          </div>
        ) : (
          <>
            <BrandingIdentityCard form={form} onChange={handleChange} />
            <BrandingLogosCard form={form} onChange={handleChange} />
            <BrandingColorsCard form={form} onChange={handleChange} />
            <BrandingMiscCard form={form} onChange={handleChange} />

            <div className="flex items-center gap-4 pb-8">
              <Button
                onClick={() => void handleSave()}
                disabled={mutResult.fetching}
              >
                {mutResult.fetching && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Branding saved
                  successfully
                </span>
              )}
              {saveError && (
                <span className="text-sm text-destructive">{saveError}</span>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
