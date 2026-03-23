/**
 * BrandedSplashScreen.test.ts — Pure logic tests for splash screen config.
 * No @testing-library/react-native required.
 * Tests the pure helper functions from BrandedSplashScreen.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  isColorDark,
  isCustomBranding,
  validateHexColor,
  buildSplashScreenOptions,
  computeAnimationDelay,
  formatSplashTagline,
  type BrandingInput,
} from '../BrandedSplashScreen';

// ---------------------------------------------------------------------------
// isColorDark
// ---------------------------------------------------------------------------
describe('BrandedSplashScreen — isColorDark', () => {
  it('returns true for black', () => {
    expect(isColorDark('#000000')).toBe(true);
  });

  it('returns false for white', () => {
    expect(isColorDark('#ffffff')).toBe(false);
  });

  it('returns true for dark blue', () => {
    expect(isColorDark('#1a1a2e')).toBe(true);
  });

  it('returns false for invalid hex', () => {
    expect(isColorDark('#abc')).toBe(false);
    expect(isColorDark('notahex')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isCustomBranding
// ---------------------------------------------------------------------------
describe('BrandedSplashScreen — isCustomBranding', () => {
  it('returns false for default EduSphere branding', () => {
    const input: BrandingInput = {
      primaryColor: '#2563eb',
      logoUrl: '',
      organizationName: 'EduSphere',
    };
    expect(isCustomBranding(input)).toBe(false);
  });

  it('returns true when org name differs', () => {
    const input: BrandingInput = {
      primaryColor: '#2563eb',
      logoUrl: '',
      organizationName: 'AcmeCorp',
    };
    expect(isCustomBranding(input)).toBe(true);
  });

  it('returns true when primary color differs', () => {
    const input: BrandingInput = {
      primaryColor: '#ff0000',
      logoUrl: '',
      organizationName: 'EduSphere',
    };
    expect(isCustomBranding(input)).toBe(true);
  });

  it('returns true when logo URL is set', () => {
    const input: BrandingInput = {
      primaryColor: '#2563eb',
      logoUrl: 'https://cdn.acme.com/logo.png',
      organizationName: 'EduSphere',
    };
    expect(isCustomBranding(input)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateHexColor
// ---------------------------------------------------------------------------
describe('BrandedSplashScreen — validateHexColor', () => {
  it('returns valid hex color as-is', () => {
    expect(validateHexColor('#ff0000')).toBe('#ff0000');
    expect(validateHexColor('#2563eb')).toBe('#2563eb');
  });

  it('returns fallback for invalid hex', () => {
    expect(validateHexColor('invalid')).toBe('#2563eb');
    expect(validateHexColor('#abc')).toBe('#2563eb');
    expect(validateHexColor('')).toBe('#2563eb');
  });

  it('uses custom fallback when provided', () => {
    expect(validateHexColor('invalid', '#000000')).toBe('#000000');
  });
});

// ---------------------------------------------------------------------------
// buildSplashScreenOptions
// ---------------------------------------------------------------------------
describe('BrandedSplashScreen — buildSplashScreenOptions', () => {
  it('builds default options for EduSphere', () => {
    const input: BrandingInput = {
      primaryColor: '#2563eb',
      logoUrl: '',
      organizationName: 'EduSphere',
    };
    const opts = buildSplashScreenOptions(input);
    expect(opts.backgroundColor).toBe('#2563eb');
    expect(opts.orgName).toBe('EduSphere');
    expect(opts.tagline).toBe('');
    expect(opts.logoUrl).toBe('');
    expect(opts.logoResizeMode).toBe('center');
    expect(opts.autoHideMs).toBe(1500);
    expect(opts.isCustomBranded).toBe(false);
    expect(opts.lightStatusBar).toBe(true);
  });

  it('builds custom options for branded org', () => {
    const input: BrandingInput = {
      primaryColor: '#1a1a2e',
      logoUrl: 'https://cdn.acme.com/logo.png',
      organizationName: 'AcmeCorp',
      tagline: 'Learn Better',
    };
    const opts = buildSplashScreenOptions(input);
    expect(opts.backgroundColor).toBe('#1a1a2e');
    expect(opts.orgName).toBe('AcmeCorp');
    expect(opts.tagline).toBe('Learn Better');
    expect(opts.logoUrl).toBe('https://cdn.acme.com/logo.png');
    expect(opts.logoResizeMode).toBe('contain');
    expect(opts.autoHideMs).toBe(2000);
    expect(opts.isCustomBranded).toBe(true);
    expect(opts.lightStatusBar).toBe(true);
  });

  it('validates and falls back for invalid primary color', () => {
    const input: BrandingInput = {
      primaryColor: 'invalid',
      logoUrl: '',
      organizationName: 'EduSphere',
    };
    const opts = buildSplashScreenOptions(input);
    expect(opts.backgroundColor).toBe('#2563eb');
  });

  it('falls back org name when empty', () => {
    const input: BrandingInput = {
      primaryColor: '#ff0000',
      logoUrl: '',
      organizationName: '',
    };
    const opts = buildSplashScreenOptions(input);
    expect(opts.orgName).toBe('EduSphere');
  });

  it('sets lightStatusBar false for light primary', () => {
    const input: BrandingInput = {
      primaryColor: '#ffffff',
      logoUrl: '',
      organizationName: 'LightOrg',
    };
    const opts = buildSplashScreenOptions(input);
    expect(opts.lightStatusBar).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeAnimationDelay
// ---------------------------------------------------------------------------
describe('BrandedSplashScreen — computeAnimationDelay', () => {
  it('returns 800ms for custom branded', () => {
    expect(computeAnimationDelay(true)).toBe(800);
  });

  it('returns 400ms for default branding', () => {
    expect(computeAnimationDelay(false)).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// formatSplashTagline
// ---------------------------------------------------------------------------
describe('BrandedSplashScreen — formatSplashTagline', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatSplashTagline(null)).toBe('');
    expect(formatSplashTagline(undefined)).toBe('');
  });

  it('returns tagline as-is when within limit', () => {
    expect(formatSplashTagline('Learn Better')).toBe('Learn Better');
  });

  it('trims whitespace', () => {
    expect(formatSplashTagline('  Hello  ')).toBe('Hello');
  });

  it('truncates long taglines with ellipsis', () => {
    const long = 'A'.repeat(100);
    const result = formatSplashTagline(long, 80);
    expect(result.length).toBe(80);
    expect(result.endsWith('...')).toBe(true);
  });

  it('respects custom max length', () => {
    const result = formatSplashTagline('Hello World', 5);
    expect(result).toBe('He...');
    expect(result.length).toBe(5);
  });

  it('does not truncate at exact max length', () => {
    const exact = 'A'.repeat(80);
    expect(formatSplashTagline(exact, 80)).toBe(exact);
  });
});
