/**
 * DomainConfigPage — Custom domain management for org tenants.
 * Route: /admin/domains
 *
 * Shows current subdomain, allows adding custom domains,
 * displays verification status and SSL provisioning state.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CUSTOM_DOMAINS_QUERY,
  REQUEST_VERIFICATION_MUTATION,
  CHECK_VERIFICATION_MUTATION,
  REMOVE_DOMAIN_MUTATION,
  domainSchema,
} from './DomainConfigPage.queries';
import type {
  DomainForm,
  CustomDomainRow,
  VerificationInfo,
} from './DomainConfigPage.queries';
import { SslBadge } from './DomainConfigPage.SslBadge';
import { DomainList } from './DomainConfigPage.DomainList';

export function DomainConfigPage() {
  const { t } = useTranslation('orgAdmin');
  const [mounted, setMounted] = useState(false);
  const [verificationInfo, setVerificationInfo] =
    useState<VerificationInfo | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }, reexecute] = useQuery<{
    customDomains: CustomDomainRow[];
    myOrganization: { slug: string };
  }>({ query: CUSTOM_DOMAINS_QUERY, pause: !mounted });

  const [, requestVerification] = useMutation(REQUEST_VERIFICATION_MUTATION);
  const [, checkVerification] = useMutation(CHECK_VERIFICATION_MUTATION);
  const [, removeDomain] = useMutation(REMOVE_DOMAIN_MUTATION);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DomainForm>({ resolver: zodResolver(domainSchema) });

  const slug = data?.myOrganization?.slug;
  const domains = data?.customDomains ?? [];

  const onAddDomain = async (d: DomainForm) => {
    const result = await requestVerification({ domain: d.domain });
    if (result.data?.requestDomainVerification) {
      setVerificationInfo(result.data.requestDomainVerification as VerificationInfo);
      reset();
      reexecute({ requestPolicy: 'network-only' });
    }
  };

  const onCheckVerification = async (domain: string) => {
    await checkVerification({ domain });
    reexecute({ requestPolicy: 'network-only' });
  };

  const onRemoveDomain = async (domainId: string) => {
    await removeDomain({ domainId });
    reexecute({ requestPolicy: 'network-only' });
  };

  return (
    <AdminLayout
      title={t('domains.title', 'Domain Configuration')}
      description={t('domains.description', 'Manage your subdomain and custom domains')}
    >
      <h1 className="sr-only">Domain Configuration</h1>
      <div data-testid="domain-config-page" className="space-y-6">
        {/* Current Subdomain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('domains.subdomain', 'Subdomain')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slug ? (
              <div className="flex items-center gap-3">
                <code className="rounded bg-muted px-3 py-1.5 text-sm font-mono">
                  {slug}.edusphere.io
                </code>
                <SslBadge status="active" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {fetching ? t('common.loading', 'Loading...') : t('domains.noSubdomain', 'No subdomain configured')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Add Custom Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('domains.addCustom', 'Add Custom Domain')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onAddDomain)}
              className="flex gap-3 items-end"
              noValidate
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor="custom-domain">
                  {t('domains.domainLabel', 'Domain')}
                </Label>
                <Input
                  id="custom-domain"
                  {...register('domain')}
                  placeholder="learn.example.com"
                  aria-required="true"
                />
                {errors.domain && (
                  <p className="text-destructive text-xs" role="alert">
                    {errors.domain.message}
                  </p>
                )}
              </div>
              <Button type="submit">
                {t('domains.addButton', 'Add Domain')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Verification Instructions */}
        {verificationInfo && (
          <Card className="border-blue-500 dark:border-blue-400">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t('domains.verifyInstructions', 'DNS Verification Required')}
              </p>
              <p className="text-sm">{verificationInfo.instructions}</p>
              <div className="rounded bg-muted p-3 text-xs font-mono space-y-1">
                <div>
                  <span className="font-semibold">Record Type:</span>{' '}
                  {verificationInfo.recordType}
                </div>
                <div>
                  <span className="font-semibold">Name:</span>{' '}
                  {verificationInfo.recordValue}
                </div>
                <div>
                  <span className="font-semibold">Value:</span>{' '}
                  {verificationInfo.token}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVerificationInfo(null)}
              >
                {t('common.dismiss', 'Dismiss')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Domain List */}
        <DomainList
          domains={domains}
          onCheck={onCheckVerification}
          onRemove={onRemoveDomain}
        />
      </div>
    </AdminLayout>
  );
}
