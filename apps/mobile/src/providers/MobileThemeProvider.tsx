/**
 * MobileThemeProvider — Dynamic branding for Expo SDK 54 mobile app.
 * Fetches tenant branding and provides theme context to all screens.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface MobileBrandingData {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  organizationName: string;
  tagline?: string | null;
}

const DEFAULT_MOBILE_BRANDING: MobileBrandingData = {
  logoUrl: '',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  organizationName: 'EduSphere',
};

interface MobileThemeContextValue {
  branding: MobileBrandingData;
  isLoading: boolean;
}

const MobileThemeContext = createContext<MobileThemeContextValue>({
  branding: DEFAULT_MOBILE_BRANDING,
  isLoading: true,
});

interface MobileThemeProviderProps {
  children: React.ReactNode;
  tenantSlug?: string | null;
  graphqlUrl?: string;
}

/**
 * Wraps the mobile app with tenant branding.
 * Uses fetch instead of urql since mobile may not have the same GraphQL client.
 */
export function MobileThemeProvider({
  children,
  tenantSlug,
  graphqlUrl = process.env.EXPO_PUBLIC_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
}: MobileThemeProviderProps) {
  const [branding, setBranding] = useState<MobileBrandingData>(DEFAULT_MOBILE_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantSlug) {
      setIsLoading(false);
      return;
    }

    const query = `
      query TenantBranding($slug: String) {
        tenantBranding(slug: $slug) {
          logoUrl primaryColor secondaryColor accentColor
          backgroundColor fontFamily organizationName tagline
        }
      }
    `;

    fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { slug: tenantSlug } }),
    })
      .then((res) => res.json())
      .then((json: { data?: { tenantBranding?: MobileBrandingData } }) => {
        if (json.data?.tenantBranding) {
          setBranding(json.data.tenantBranding);
        }
      })
      .catch(() => {
        // Fall back to defaults on network error
      })
      .finally(() => setIsLoading(false));
  }, [tenantSlug, graphqlUrl]);

  return (
    <MobileThemeContext.Provider value={{ branding, isLoading }}>
      {children}
    </MobileThemeContext.Provider>
  );
}

/** Hook to access tenant branding in mobile screens. */
export function useMobileTheme(): MobileThemeContextValue {
  return useContext(MobileThemeContext);
}
