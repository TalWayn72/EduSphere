/**
 * SubdomainSetup — UI for org subdomain configuration.
 *
 * Shows input, validation feedback, DNS status, and live URL preview.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useSubdomainProvisioning,
  type DnsStatus,
  type ProvisioningStatus,
} from '@/hooks/useSubdomainProvisioning';

function DnsBadge({ status }: { status: DnsStatus }) {
  const { t } = useTranslation('orgOnboarding');
  const labels: Record<DnsStatus, string> = {
    idle: '',
    checking: t('org.checkingSlug', 'Checking...'),
    valid: t('org.slugAvailable', 'Available!'),
    invalid: t('org.slugTaken', 'Not available'),
    error: 'Error checking DNS',
  };
  if (status === 'idle') return null;

  const colors: Record<DnsStatus, string> = {
    idle: '',
    checking: 'text-muted-foreground',
    valid: 'text-green-600',
    invalid: 'text-red-600',
    error: 'text-red-600',
  };

  return (
    <span data-testid="dns-badge" className={`text-xs ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function ProvisionButton({
  status,
  disabled,
  onClick,
}: {
  status: ProvisioningStatus;
  disabled: boolean;
  onClick: () => void;
}) {
  const labels: Record<ProvisioningStatus, string> = {
    idle: 'Provision Subdomain',
    provisioning: 'Provisioning...',
    active: 'Active',
    failed: 'Retry',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || status === 'provisioning' || status === 'active'}
      className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
    >
      {labels[status]}
    </button>
  );
}

export function SubdomainSetup() {
  const { t } = useTranslation('orgOnboarding');
  const {
    subdomain,
    setSubdomain,
    validation,
    dnsStatus,
    provisioningStatus,
    previewUrl,
    checkAvailability,
    provision,
  } = useSubdomainProvisioning();

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">
        {t('org.slugLabel', 'Subdomain Configuration')}
      </h2>

      <div className="space-y-2">
        <label htmlFor="subdomain-input" className="text-sm font-medium">
          {t('org.slugLabel', 'Subdomain')}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <input
              id="subdomain-input"
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="your-org"
              className="rounded-l-md px-3 py-2 text-sm"
              aria-describedby="subdomain-hint"
            />
            <span className="bg-muted px-3 py-2 text-sm text-muted-foreground">
              .edusphere.app
            </span>
          </div>
          <button
            onClick={checkAvailability}
            disabled={!validation.isValid || dnsStatus === 'checking'}
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            {t('org.checkingSlug', 'Check')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!validation.isValid && subdomain && (
            <span
              role="alert"
              className="text-xs text-red-600"
            >
              {validation.error}
            </span>
          )}
          <DnsBadge status={dnsStatus} />
        </div>

        <p id="subdomain-hint" className="text-xs text-muted-foreground">
          3-63 characters, lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">Preview URL</p>
        <p data-testid="preview-url" className="text-sm font-medium">
          {previewUrl}
        </p>
      </div>

      <ProvisionButton
        status={provisioningStatus}
        disabled={dnsStatus !== 'valid'}
        onClick={provision}
      />
    </div>
  );
}
