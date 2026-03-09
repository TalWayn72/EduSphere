import React, { createContext, useContext } from 'react';
import { useTenantBranding, type TenantBrandingExtended } from '@/hooks/useTenantBranding';
import { DEFAULT_BRANDING } from '@/lib/branding';

interface BrandingContextValue {
  branding: TenantBrandingExtended;
  fetching: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  fetching: false,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const value = useTenantBranding();
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}
