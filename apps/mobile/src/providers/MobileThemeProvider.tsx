/**
 * MobileThemeProvider — Dynamic branding for Expo SDK 54 mobile app.
 * Fetches tenant branding and provides theme context to all screens.
 * Configures StatusBar, navigation bar, and splash screen per tenant.
 * Caches last-used tenant slug in AsyncStorage for instant cold start branding.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TENANT_SLUG_KEY = '@edusphere/last_tenant_slug';
const BRANDING_CACHE_KEY = '@edusphere/cached_branding';

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
  tenantSlug: string | null;
}

const MobileThemeContext = createContext<MobileThemeContextValue>({
  branding: DEFAULT_MOBILE_BRANDING,
  isLoading: true,
  tenantSlug: null,
});

interface MobileThemeProviderProps {
  children: React.ReactNode;
  tenantSlug?: string | null;
  graphqlUrl?: string;
}

/** Determine if a hex color is dark (for StatusBar text color). */
function isColorDark(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/** Apply platform-level branding (StatusBar color). */
function applyPlatformBranding(branding: MobileBrandingData): void {
  // StatusBar: use light content on dark primary, dark content on light primary
  const barStyle = isColorDark(branding.primaryColor)
    ? 'light-content'
    : 'dark-content';
  StatusBar.setBarStyle(barStyle);
  StatusBar.setBackgroundColor?.(branding.primaryColor);
}

/** Cache branding + slug to AsyncStorage for cold start. */
async function cacheBranding(
  slug: string,
  branding: MobileBrandingData
): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [TENANT_SLUG_KEY, slug],
      [BRANDING_CACHE_KEY, JSON.stringify(branding)],
    ]);
  } catch {
    // Non-fatal: caching failure should not crash the app
  }
}

/** Load cached branding from AsyncStorage. */
async function loadCachedBranding(): Promise<{
  slug: string | null;
  branding: MobileBrandingData | null;
}> {
  try {
    const pairs = await AsyncStorage.multiGet([
      TENANT_SLUG_KEY,
      BRANDING_CACHE_KEY,
    ]);
    const slug = pairs[0]?.[1] ?? null;
    const raw = pairs[1]?.[1];
    const branding = raw
      ? (JSON.parse(raw) as MobileBrandingData)
      : null;
    return { slug, branding };
  } catch {
    return { slug: null, branding: null };
  }
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
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug ?? null);

  // On mount: load cached branding for instant cold start
  useEffect(() => {
    if (tenantSlug) {
      setResolvedSlug(tenantSlug);
      return;
    }
    loadCachedBranding().then(({ slug, branding: cached }) => {
      if (slug && cached) {
        setResolvedSlug(slug);
        setBranding(cached);
        applyPlatformBranding(cached);
      }
    }).catch(() => {
      // Non-fatal
    });
  }, [tenantSlug]);

  // Fetch branding from server when slug is known
  useEffect(() => {
    if (!resolvedSlug) {
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
      body: JSON.stringify({ query, variables: { slug: resolvedSlug } }),
    })
      .then((res) => res.json())
      .then((json: { data?: { tenantBranding?: MobileBrandingData } }) => {
        if (json.data?.tenantBranding) {
          const serverBranding = json.data.tenantBranding;
          setBranding(serverBranding);
          applyPlatformBranding(serverBranding);
          void cacheBranding(resolvedSlug, serverBranding);
        }
      })
      .catch(() => {
        // Fall back to cached or defaults on network error
      })
      .finally(() => setIsLoading(false));
  }, [resolvedSlug, graphqlUrl]);

  return (
    <MobileThemeContext.Provider value={{ branding, isLoading, tenantSlug: resolvedSlug }}>
      {children}
    </MobileThemeContext.Provider>
  );
}

/** Hook to access tenant branding in mobile screens. */
export function useMobileTheme(): MobileThemeContextValue {
  return useContext(MobileThemeContext);
}

// Export helpers for testing
export { isColorDark, DEFAULT_MOBILE_BRANDING, TENANT_SLUG_KEY, BRANDING_CACHE_KEY };
