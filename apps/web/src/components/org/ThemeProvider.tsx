/**
 * OrgThemeProvider — Injects tenant branding as CSS variables and React context.
 */
import React, { createContext, useEffect, useRef } from 'react';
import { useTenantBranding } from '@/hooks/useTenantBranding';

interface OrgTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  logoUrl: string;
  orgName: string;
}

const DEFAULT_THEME: OrgTheme = {
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  logoUrl: '',
  orgName: '',
};

export const OrgThemeContext = createContext<OrgTheme | null>(null);

interface OrgThemeProviderProps {
  slug: string;
  children: React.ReactNode;
}

export function OrgThemeProvider({ slug, children }: OrgThemeProviderProps) {
  const { branding, isLoading } = useTenantBranding();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const theme: OrgTheme = branding ?? DEFAULT_THEME;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.setProperty('--primary', theme.primaryColor);
    el.style.setProperty('--secondary', theme.secondaryColor);
    el.style.setProperty('--accent', theme.accentColor);
    el.style.setProperty('--background', theme.backgroundColor);
    el.style.setProperty('--font-family', theme.fontFamily);
  }, [theme]);

  return (
    <OrgThemeContext.Provider value={theme}>
      <div ref={wrapperRef} data-theme-provider>
        {children}
      </div>
    </OrgThemeContext.Provider>
  );
}
