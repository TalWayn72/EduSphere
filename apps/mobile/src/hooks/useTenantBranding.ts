/**
 * useTenantBranding — Hook for accessing tenant branding in mobile components.
 * Re-exports from MobileThemeProvider with convenience helpers.
 */
import { useMemo } from 'react';
import { useMobileTheme, type MobileBrandingData } from '../providers/MobileThemeProvider';

interface TenantBrandingResult {
  /** Current tenant branding data */
  branding: MobileBrandingData;
  /** Whether branding is still loading from the API */
  isLoading: boolean;
  /** Dynamic style object for the primary color */
  primaryStyle: { color: string };
  /** Dynamic style object for the primary background */
  primaryBgStyle: { backgroundColor: string };
  /** Dynamic style object for the accent color */
  accentStyle: { color: string };
  /** Dynamic style for the full brand background */
  backgroundStyle: { backgroundColor: string };
}

/**
 * Access tenant branding with pre-computed style objects.
 *
 * @example
 * ```tsx
 * const { branding, primaryBgStyle } = useTenantBranding();
 * return <View style={primaryBgStyle}><Text>{branding.organizationName}</Text></View>;
 * ```
 */
export function useTenantBranding(): TenantBrandingResult {
  const { branding, isLoading } = useMobileTheme();

  const primaryStyle = useMemo(
    () => ({ color: branding.primaryColor }),
    [branding.primaryColor],
  );

  const primaryBgStyle = useMemo(
    () => ({ backgroundColor: branding.primaryColor }),
    [branding.primaryColor],
  );

  const accentStyle = useMemo(
    () => ({ color: branding.accentColor }),
    [branding.accentColor],
  );

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: branding.backgroundColor }),
    [branding.backgroundColor],
  );

  return {
    branding,
    isLoading,
    primaryStyle,
    primaryBgStyle,
    accentStyle,
    backgroundStyle,
  };
}
