import { useEffect } from 'react';
import { useQuery } from 'urql';
import { TENANT_BRANDING_QUERY } from '@/lib/graphql/branding.queries';
import { applyTenantBranding, DEFAULT_BRANDING, type TenantBrandingData } from '@/lib/branding';

export interface TenantBrandingExtended extends TenantBrandingData {
  customCss?: string | null;
}

interface TenantBrandingResult {
  myTenantBranding: TenantBrandingExtended;
}

/** Inject customCss into <head> as a <style> tag safely (textContent, not innerHTML) */
function injectCustomCss(css: string | null | undefined): void {
  const id = 'tenant-custom-css';
  let el = document.getElementById(id) as HTMLElement | null;
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css; // textContent is XSS-safe (not innerHTML)
}

export function useTenantBranding() {
  const [{ data, fetching }] = useQuery<TenantBrandingResult>({
    query: TENANT_BRANDING_QUERY,
    requestPolicy: 'cache-and-network',
  });

  useEffect(() => {
    const branding = data?.myTenantBranding;
    if (!branding) return;
    applyTenantBranding(branding);
    injectCustomCss(branding.customCss);
  }, [data]);

  return {
    branding: (data?.myTenantBranding ?? DEFAULT_BRANDING) as TenantBrandingExtended,
    fetching,
  };
}
