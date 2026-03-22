/**
 * ThemeProvider — Injects tenant branding CSS variables from backend data.
 * Wraps the app and applies branding on mount + whenever branding data changes.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from 'urql';
import {
  applyTenantBranding,
  detectTenantSlug,
  DEFAULT_BRANDING,
  type TenantBrandingData,
} from '@/lib/branding';

const TENANT_BRANDING_QUERY = `
  query TenantBranding($slug: String) {
    tenantBranding(slug: $slug) {
      logoUrl logoMarkUrl faviconUrl
      primaryColor secondaryColor accentColor backgroundColor
      fontFamily organizationName tagline
      privacyPolicyUrl termsOfServiceUrl supportEmail
      hideEduSphereBranding
    }
  }
`;

interface ThemeContextValue {
  branding: TenantBrandingData;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const slug = detectTenantSlug();

  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching }] = useQuery<{ tenantBranding: TenantBrandingData }>({
    query: TENANT_BRANDING_QUERY,
    variables: { slug },
    pause: !mounted,
  });

  const branding = data?.tenantBranding ?? DEFAULT_BRANDING;

  useEffect(() => {
    if (data?.tenantBranding) {
      applyTenantBranding(data.tenantBranding);
    }
  }, [data]);

  return (
    <ThemeContext.Provider value={{ branding, isLoading: fetching }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook to access current tenant branding. */
export function useTenantTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
