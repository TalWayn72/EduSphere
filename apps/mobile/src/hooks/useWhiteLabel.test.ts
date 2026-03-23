/**
 * useWhiteLabel.test.ts — Pure logic tests for white-label mobile hook.
 * No @testing-library/react-native — tests pure helper functions only.
 */
import { describe, it, expect } from 'vitest';
import {
  isColorDark,
  contrastColor,
  buildSplashConfig,
  buildNavBarStyle,
  buildAppBarStyle,
} from './useWhiteLabel';
import type { MobileBrandingData } from '../providers/MobileThemeProvider';

const DEFAULT_BRANDING: MobileBrandingData = {
  logoUrl: '',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  organizationName: 'EduSphere',
};

const CUSTOM_BRANDING: MobileBrandingData = {
  logoUrl: 'https://cdn.acme.com/logo.png',
  primaryColor: '#1a1a2e',
  secondaryColor: '#16213e',
  accentColor: '#e94560',
  backgroundColor: '#0f3460',
  fontFamily: 'Roboto',
  organizationName: 'AcmeCorp',
  tagline: 'Learn with AcmeCorp',
};

// ---------------------------------------------------------------------------
// isColorDark
// ---------------------------------------------------------------------------
describe('isColorDark', () => {
  it('returns true for dark colors', () => {
    expect(isColorDark('#000000')).toBe(true);
    expect(isColorDark('#1a1a2e')).toBe(true);
    expect(isColorDark('#333333')).toBe(true);
  });

  it('returns false for light colors', () => {
    expect(isColorDark('#ffffff')).toBe(false);
    expect(isColorDark('#f0f0f0')).toBe(false);
    expect(isColorDark('#ffcc00')).toBe(false);
  });

  it('returns false for invalid hex', () => {
    expect(isColorDark('#abc')).toBe(false);
    expect(isColorDark('invalid')).toBe(false);
  });

  it('handles medium luminance colors', () => {
    // #808080 has luminance ~0.5
    expect(isColorDark('#808080')).toBe(false);
    expect(isColorDark('#707070')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// contrastColor
// ---------------------------------------------------------------------------
describe('contrastColor', () => {
  it('returns white for dark backgrounds', () => {
    expect(contrastColor('#000000')).toBe('#ffffff');
    expect(contrastColor('#1a1a2e')).toBe('#ffffff');
  });

  it('returns dark for light backgrounds', () => {
    expect(contrastColor('#ffffff')).toBe('#1a1a1a');
    expect(contrastColor('#f0f0f0')).toBe('#1a1a1a');
  });
});

// ---------------------------------------------------------------------------
// buildSplashConfig
// ---------------------------------------------------------------------------
describe('buildSplashConfig', () => {
  it('builds config from default branding', () => {
    const config = buildSplashConfig(DEFAULT_BRANDING);
    expect(config.backgroundColor).toBe('#2563eb');
    expect(config.orgName).toBe('EduSphere');
    expect(config.tagline).toBe('');
    expect(config.logoUrl).toBe('');
    expect(config.lightStatusBar).toBe(true); // #2563eb is dark
  });

  it('builds config from custom branding', () => {
    const config = buildSplashConfig(CUSTOM_BRANDING);
    expect(config.backgroundColor).toBe('#1a1a2e');
    expect(config.orgName).toBe('AcmeCorp');
    expect(config.tagline).toBe('Learn with AcmeCorp');
    expect(config.logoUrl).toBe('https://cdn.acme.com/logo.png');
    expect(config.lightStatusBar).toBe(true);
  });

  it('uses default org name when empty', () => {
    const branding = { ...DEFAULT_BRANDING, organizationName: '' };
    const config = buildSplashConfig(branding);
    expect(config.orgName).toBe('EduSphere');
  });

  it('sets lightStatusBar false for light primary color', () => {
    const branding = { ...DEFAULT_BRANDING, primaryColor: '#ffffff' };
    const config = buildSplashConfig(branding);
    expect(config.lightStatusBar).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildNavBarStyle
// ---------------------------------------------------------------------------
describe('buildNavBarStyle', () => {
  it('builds nav bar style with contrast text', () => {
    const style = buildNavBarStyle(CUSTOM_BRANDING);
    expect(style.backgroundColor).toBe('#1a1a2e');
    expect(style.tintColor).toBe('#ffffff');
    expect(style.titleColor).toBe('#ffffff');
  });

  it('uses dark text for light primary', () => {
    const branding = { ...DEFAULT_BRANDING, primaryColor: '#ffffff' };
    const style = buildNavBarStyle(branding);
    expect(style.tintColor).toBe('#1a1a1a');
  });

  it('falls back to default primary when empty', () => {
    const branding = { ...DEFAULT_BRANDING, primaryColor: '' };
    const style = buildNavBarStyle(branding);
    expect(style.backgroundColor).toBe('#2563eb');
  });
});

// ---------------------------------------------------------------------------
// buildAppBarStyle
// ---------------------------------------------------------------------------
describe('buildAppBarStyle', () => {
  it('builds app bar style from branding', () => {
    const style = buildAppBarStyle(CUSTOM_BRANDING);
    expect(style.backgroundColor).toBe('#0f3460');
    expect(style.iconColor).toBe('#1a1a2e');
    expect(style.titleColor).toBe('#ffffff');
  });

  it('uses white background by default', () => {
    const branding = { ...DEFAULT_BRANDING, backgroundColor: '' };
    const style = buildAppBarStyle(branding);
    expect(style.backgroundColor).toBe('#ffffff');
    expect(style.titleColor).toBe('#1a1a1a');
  });

  it('falls back to default primary for icon color', () => {
    const branding = { ...DEFAULT_BRANDING, primaryColor: '' };
    const style = buildAppBarStyle(branding);
    expect(style.iconColor).toBe('#2563eb');
  });
});
