/**
 * useSubdomainProvisioning — Hook for org admins to request/configure subdomains.
 *
 * Provides subdomain validation, availability checking, and provisioning status.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

/** Reserved subdomains that cannot be claimed by orgs. */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'mail',
  'smtp',
  'ftp',
  'ssh',
  'login',
  'auth',
  'sso',
  'cdn',
  'static',
  'assets',
  'docs',
  'help',
  'support',
  'status',
  'blog',
  'test',
  'staging',
  'dev',
  'sandbox',
  'demo',
  'beta',
  'preview',
  'internal',
  'portal',
]);

export type DnsStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'error';
export type ProvisioningStatus = 'idle' | 'provisioning' | 'active' | 'failed';

export interface SubdomainValidation {
  isValid: boolean;
  error?: string;
}

export interface UseSubdomainProvisioningReturn {
  subdomain: string;
  setSubdomain: (value: string) => void;
  validation: SubdomainValidation;
  dnsStatus: DnsStatus;
  provisioningStatus: ProvisioningStatus;
  previewUrl: string;
  checkAvailability: () => Promise<void>;
  provision: () => Promise<void>;
}

/** Validate subdomain format: alphanumeric + hyphens, 3-63 chars. */
export function validateSubdomain(value: string): SubdomainValidation {
  if (!value) {
    return { isValid: false, error: 'Subdomain is required' };
  }
  if (value.length < 3) {
    return { isValid: false, error: 'Subdomain must be at least 3 characters' };
  }
  if (value.length > 63) {
    return { isValid: false, error: 'Subdomain must be at most 63 characters' };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) {
    return {
      isValid: false,
      error: 'Only lowercase letters, numbers, and hyphens allowed',
    };
  }
  if (RESERVED_SUBDOMAINS.has(value)) {
    return { isValid: false, error: 'This subdomain is reserved' };
  }
  return { isValid: true };
}

export function useSubdomainProvisioning(): UseSubdomainProvisioningReturn {
  const [subdomain, setSubdomainRaw] = useState('');
  const [dnsStatus, setDnsStatus] = useState<DnsStatus>('idle');
  const [provisioningStatus, setProvisioningStatus] =
    useState<ProvisioningStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ref.current intentionally read at cleanup for timer cancellation
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const validation = validateSubdomain(subdomain);
  const previewUrl = subdomain
    ? `https://${subdomain}.edusphere.app`
    : 'https://your-org.edusphere.app';

  const setSubdomain = useCallback((value: string) => {
    setSubdomainRaw(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setDnsStatus('idle');
  }, []);

  const checkAvailability = useCallback(async () => {
    if (!validation.isValid) return;
    setDnsStatus('checking');
    // Placeholder — will call backend API for DNS validation
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDnsStatus('valid');
  }, [validation.isValid]);

  const provision = useCallback(async () => {
    if (!validation.isValid || dnsStatus !== 'valid') return;
    setProvisioningStatus('provisioning');
    // Placeholder — will call backend provisioning API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setProvisioningStatus('active');
  }, [validation.isValid, dnsStatus]);

  return {
    subdomain,
    setSubdomain,
    validation,
    dnsStatus,
    provisioningStatus,
    previewUrl,
    checkAvailability,
    provision,
  };
}
