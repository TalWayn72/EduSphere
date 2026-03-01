/**
 * Tests for lib/branding.ts
 *
 * Covers: DEFAULT_BRANDING values, applyTenantBranding CSS property setting,
 * document.title update, favicon href update, font-family behaviour,
 * and detectTenantSlug subdomain detection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Imports under test ────────────────────────────────────────────────────────
import {
  DEFAULT_BRANDING,
  applyTenantBranding,
  detectTenantSlug,
  type TenantBrandingData,
} from './branding';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBranding(overrides: Partial<TenantBrandingData> = {}): TenantBrandingData {
  return { ...DEFAULT_BRANDING, ...overrides };
}

// ── DEFAULT_BRANDING ──────────────────────────────────────────────────────────

describe('DEFAULT_BRANDING', () => {
  it('has the correct logoUrl', () => {
    expect(DEFAULT_BRANDING.logoUrl).toBe('/defaults/logo.svg');
  });

  it('has the correct faviconUrl', () => {
    expect(DEFAULT_BRANDING.faviconUrl).toBe('/defaults/favicon.ico');
  });

  it('has the correct primaryColor', () => {
    expect(DEFAULT_BRANDING.primaryColor).toBe('#2563eb');
  });

  it('has the correct secondaryColor', () => {
    expect(DEFAULT_BRANDING.secondaryColor).toBe('#64748b');
  });

  it('has the correct accentColor', () => {
    expect(DEFAULT_BRANDING.accentColor).toBe('#f59e0b');
  });

  it('has the correct backgroundColor', () => {
    expect(DEFAULT_BRANDING.backgroundColor).toBe('#ffffff');
  });

  it('has fontFamily Inter by default', () => {
    expect(DEFAULT_BRANDING.fontFamily).toBe('Inter');
  });

  it('has organizationName EduSphere by default', () => {
    expect(DEFAULT_BRANDING.organizationName).toBe('EduSphere');
  });

  it('has hideEduSphereBranding false by default', () => {
    expect(DEFAULT_BRANDING.hideEduSphereBranding).toBe(false);
  });
});

// ── applyTenantBranding ───────────────────────────────────────────────────────

describe('applyTenantBranding', () => {
  let setPropertySpy: ReturnType<typeof vi.spyOn>;
  let faviconEl: HTMLLinkElement;

  beforeEach(() => {
    // Spy on document.documentElement.style.setProperty
    setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty');

    // Create a fake favicon <link rel="icon"> element in the DOM
    faviconEl = document.createElement('link');
    faviconEl.rel = 'icon';
    faviconEl.href = '/old-favicon.ico';
    document.head.appendChild(faviconEl);
  });

  afterEach(() => {
    // Remove the favicon element after each test
    faviconEl.remove();
    vi.restoreAllMocks();
  });

  it('sets --primary CSS custom property', () => {
    applyTenantBranding(makeBranding({ primaryColor: '#2563eb' }));
    expect(setPropertySpy).toHaveBeenCalledWith('--primary', expect.any(String));
  });

  it('sets --secondary CSS custom property', () => {
    applyTenantBranding(makeBranding());
    expect(setPropertySpy).toHaveBeenCalledWith('--secondary', expect.any(String));
  });

  it('sets --accent CSS custom property', () => {
    applyTenantBranding(makeBranding());
    expect(setPropertySpy).toHaveBeenCalledWith('--accent', expect.any(String));
  });

  it('sets --background CSS custom property', () => {
    applyTenantBranding(makeBranding());
    expect(setPropertySpy).toHaveBeenCalledWith('--background', expect.any(String));
  });

  it('sets document.title to organizationName', () => {
    applyTenantBranding(makeBranding({ organizationName: 'Acme Academy' }));
    expect(document.title).toBe('Acme Academy');
  });

  it('updates favicon href when a link[rel="icon"] element exists', () => {
    applyTenantBranding(makeBranding({ faviconUrl: '/custom/favicon.png' }));
    expect(faviconEl.href).toContain('/custom/favicon.png');
  });

  it('sets --font-sans when fontFamily is not Inter', () => {
    applyTenantBranding(makeBranding({ fontFamily: 'Roboto' }));
    expect(setPropertySpy).toHaveBeenCalledWith(
      '--font-sans',
      "'Roboto', Inter, sans-serif"
    );
  });

  it('does NOT set --font-sans when fontFamily is Inter', () => {
    applyTenantBranding(makeBranding({ fontFamily: 'Inter' }));
    const calls = setPropertySpy.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain('--font-sans');
  });
});

// ── detectTenantSlug ──────────────────────────────────────────────────────────

describe('detectTenantSlug', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the subdomain for a 3-part hostname', () => {
    vi.stubGlobal('window', {
      ...window,
      location: { hostname: 'client.edusphere.io' },
    });
    expect(detectTenantSlug()).toBe('client');
  });

  it('returns null for www.edusphere.io', () => {
    vi.stubGlobal('window', {
      ...window,
      location: { hostname: 'www.edusphere.io' },
    });
    expect(detectTenantSlug()).toBeNull();
  });

  it('returns null for app.edusphere.io', () => {
    vi.stubGlobal('window', {
      ...window,
      location: { hostname: 'app.edusphere.io' },
    });
    expect(detectTenantSlug()).toBeNull();
  });

  it('returns null for a 2-part hostname (no subdomain)', () => {
    vi.stubGlobal('window', {
      ...window,
      location: { hostname: 'edusphere.io' },
    });
    expect(detectTenantSlug()).toBeNull();
  });

  it('returns null for localhost', () => {
    vi.stubGlobal('window', {
      ...window,
      location: { hostname: 'localhost' },
    });
    expect(detectTenantSlug()).toBeNull();
  });
});
