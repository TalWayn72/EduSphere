/**
 * SsoConfigPage — SAML/OIDC SSO configuration for org tenants.
 * Route: /admin/sso
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const SSO_CONFIG_QUERY = `
  query SsoConfig { ssoConfig { provider entityId ssoUrl certificate status } }
`;
const UPDATE_SSO_MUTATION = `
  mutation UpdateSsoConfig($input: SsoConfigInput!) {
    updateSsoConfig(input: $input) { provider status }
  }
`;

const samlSchema = z.object({
  entityId: z.string().url('Must be a valid URL').min(1),
  ssoUrl: z.string().url('Must be a valid URL').min(1),
  certificate: z.string().min(10, 'Certificate is required'),
});

const oidcSchema = z.object({
  issuer: z.string().url('Must be a valid URL').min(1),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  discoveryUrl: z.string().url().optional(),
});

type SamlForm = z.infer<typeof samlSchema>;
type OidcForm = z.infer<typeof oidcSchema>;

export function SsoConfigPage() {
  const { t } = useTranslation('orgAdmin');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data }] = useQuery({ query: SSO_CONFIG_QUERY, pause: !mounted });
  const [, updateSso] = useMutation(UPDATE_SSO_MUTATION);

  const samlForm = useForm<SamlForm>({ resolver: zodResolver(samlSchema) });
  const oidcForm = useForm<OidcForm>({ resolver: zodResolver(oidcSchema) });

  const config = data?.ssoConfig as { provider: string; status: string } | undefined;

  const onSaml = async (d: SamlForm) => {
    await updateSso({ input: { provider: 'SAML', ...d } });
  };

  const onOidc = async (d: OidcForm) => {
    await updateSso({ input: { provider: 'OIDC', ...d } });
  };

  return (
    <AdminLayout title={t('sso.title')} description={t('sso.description')}>
      <div data-testid="sso-config-page" className="space-y-6">
        {config && (
          <div className="flex items-center gap-2">
            <span className="text-sm">{t('sso.currentProvider')}:</span>
            <Badge variant="outline">{config.provider}</Badge>
            <Badge className={config.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
              {config.status}
            </Badge>
          </div>
        )}

        <Tabs defaultValue="saml">
          <TabsList>
            <TabsTrigger value="saml">SAML 2.0</TabsTrigger>
            <TabsTrigger value="oidc">OpenID Connect</TabsTrigger>
          </TabsList>

          <TabsContent value="saml">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('sso.samlTitle')}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={samlForm.handleSubmit(onSaml)} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="entityId">{t('sso.entityId')}</Label>
                    <Input id="entityId" {...samlForm.register('entityId')} placeholder="https://idp.example.com/metadata" />
                    {samlForm.formState.errors.entityId && (
                      <p className="text-destructive text-xs" role="alert">{samlForm.formState.errors.entityId.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ssoUrl">{t('sso.ssoUrl')}</Label>
                    <Input id="ssoUrl" {...samlForm.register('ssoUrl')} placeholder="https://idp.example.com/sso" />
                    {samlForm.formState.errors.ssoUrl && (
                      <p className="text-destructive text-xs" role="alert">{samlForm.formState.errors.ssoUrl.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate">{t('sso.certificate')}</Label>
                    <textarea
                      id="certificate"
                      {...samlForm.register('certificate')}
                      className="w-full h-24 rounded border p-2 text-xs font-mono bg-background"
                      placeholder={t('sso.certificatePlaceholder')}
                    />
                    {samlForm.formState.errors.certificate && (
                      <p className="text-destructive text-xs" role="alert">{samlForm.formState.errors.certificate.message}</p>
                    )}
                  </div>
                  <Button type="submit">{t('sso.save')}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oidc">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('sso.oidcTitle')}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={oidcForm.handleSubmit(onOidc)} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="issuer">{t('sso.issuer')}</Label>
                    <Input id="issuer" {...oidcForm.register('issuer')} placeholder="https://accounts.google.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">{t('sso.clientId')}</Label>
                    <Input id="clientId" {...oidcForm.register('clientId')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">{t('sso.clientSecret')}</Label>
                    <Input id="clientSecret" type="password" {...oidcForm.register('clientSecret')} />
                  </div>
                  <Button type="submit">{t('sso.save')}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
