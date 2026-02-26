export interface TenantBrandingData {
  logoUrl: string;
  logoMarkUrl?: string | null;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  organizationName: string;
  tagline?: string | null;
  privacyPolicyUrl?: string | null;
  termsOfServiceUrl?: string | null;
  supportEmail?: string | null;
  hideEduSphereBranding: boolean;
}

export const DEFAULT_BRANDING: TenantBrandingData = {
  logoUrl: '/defaults/logo.svg',
  faviconUrl: '/defaults/favicon.ico',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  organizationName: 'EduSphere',
  hideEduSphereBranding: false,
};

/** Convert hex #rrggbb to "h s% l%" for CSS custom properties */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Apply tenant branding to the document root.
 * Sets CSS custom properties used by Tailwind / shadcn/ui.
 */
export function applyTenantBranding(branding: TenantBrandingData): void {
  const root = document.documentElement;
  root.style.setProperty('--primary', hexToHsl(branding.primaryColor));
  root.style.setProperty('--secondary', hexToHsl(branding.secondaryColor));
  root.style.setProperty('--accent', hexToHsl(branding.accentColor));
  root.style.setProperty('--background', hexToHsl(branding.backgroundColor));

  if (branding.fontFamily && branding.fontFamily !== 'Inter') {
    root.style.setProperty(
      '--font-sans',
      `'${branding.fontFamily}', Inter, sans-serif`
    );
  }

  document.title = branding.organizationName;
  const favicon = document.querySelector(
    'link[rel="icon"]'
  ) as HTMLLinkElement | null;
  if (favicon) favicon.href = branding.faviconUrl;
}

/** Detect tenant from subdomain: client.edusphere.io → 'client' */
export function detectTenantSlug(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
    return parts[0] ?? null;
  }
  return null;
}
