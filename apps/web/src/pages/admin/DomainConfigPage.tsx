/**
 * DomainConfigPage — Custom domain management for org tenants.
 * Route: /admin/domains
 *
 * Shows current subdomain, allows adding custom domains,
 * displays verification status and SSL provisioning state.
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
import { Badge } from '@/components/ui/badge';

// ── GraphQL ─────────────────────────────────────────────────

const CUSTOM_DOMAINS_QUERY = `
  query CustomDomains {
    customDomains {
      id domain verificationToken verificationRecordType
      verifiedAt sslStatus createdAt
    }
    myOrganization { slug }
  }
`;

const REQUEST_VERIFICATION_MUTATION = `
  mutation RequestDomainVerification($domain: String!) {
    requestDomainVerification(domain: $domain) {
      token recordType recordValue instructions
    }
  }
`;

const CHECK_VERIFICATION_MUTATION = `
  mutation CheckDomainVerification($domain: String!) {
    checkDomainVerification(domain: $domain) {
      id domain verifiedAt sslStatus
    }
  }
`;

const REMOVE_DOMAIN_MUTATION = `
  mutation RemoveCustomDomain($domainId: ID!) {
    removeCustomDomain(domainId: $domainId)
  }
`;

// ── Validation ──────────────────────────────────────────────

const domainSchema = z.object({
  domain: z
    .string()
    .min(4, 'Domain is too short')
    .max(255)
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
      'Enter a valid domain (e.g., learn.example.com)'
    ),
});

type DomainForm = z.infer<typeof domainSchema>;

// ── SSL Status Badge ────────────────────────────────────────

function SslBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    provisioning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return (
    <Badge className={colors[status] ?? colors.pending} data-testid={`ssl-${status}`}>
      SSL: {status}
    </Badge>
  );
}

// ── Component ───────────────────────────────────────────────

interface CustomDomainRow {
  id: string;
  domain: string;
  verificationToken: string | null;
  verificationRecordType: string | null;
  verifiedAt: string | null;
  sslStatus: string;
  createdAt: string;
}

interface VerificationInfo {
  token: string;
  recordType: string;
  recordValue: string;
  instructions: string;
}

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
        {domains.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('domains.customDomains', 'Custom Domains')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y" data-testid="domains-list">
                {domains.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-3"
                    data-testid={`domain-row-${d.domain}`}
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono">{d.domain}</code>
                      {d.verifiedAt ? (
                        <Badge className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      <SslBadge status={d.sslStatus} />
                    </div>
                    <div className="flex gap-2">
                      {!d.verifiedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCheckVerification(d.domain)}
                        >
                          {t('domains.checkVerification', 'Check')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => onRemoveDomain(d.id)}
                      >
                        {t('common.remove', 'Remove')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
