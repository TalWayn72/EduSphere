/**
 * useWhiteLabel — Hook for loading org branding in mobile context.
 * Provides white-label configuration for the mobile shell including
 * splash screen config, app bar styling, and navigation theming.
 * Pure logic — no React Native UI dependencies.
 */
import { useMemo } from 'react';
import {
  useMobileTheme,
  type MobileBrandingData,
} from '../providers/MobileThemeProvider';

export interface WhiteLabelConfig {
  /** Current branding data */
  branding: MobileBrandingData;
  /** Whether branding is still loading */
  isLoading: boolean;
  /** Whether org has custom branding (not defaults) */
  isCustomBranded: boolean;
  /** Splash screen configuration derived from branding */
  splashConfig: SplashScreenConfig;
  /** Navigation bar style derived from branding */
  navBarStyle: NavBarStyle;
  /** App bar style derived from branding */
  appBarStyle: AppBarStyle;
}

export interface SplashScreenConfig {
  /** Background color for splash screen */
  backgroundColor: string;
  /** Logo URL to display on splash */
  logoUrl: string;
  /** Organization name for splash text */
  orgName: string;
  /** Tagline shown below org name */
  tagline: string;
  /** Whether to use light status bar (for dark backgrounds) */
  lightStatusBar: boolean;
}

export interface NavBarStyle {
  backgroundColor: string;
  tintColor: string;
  titleColor: string;
}

export interface AppBarStyle {
  backgroundColor: string;
  iconColor: string;
  titleColor: string;
}

const DEFAULT_ORG_NAME = 'EduSphere';
const DEFAULT_PRIMARY = '#2563eb';

/** Determine if a hex color is dark (luminance < 0.5). */
export function isColorDark(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/** Derive contrast color (white or dark) for a given background. */
export function contrastColor(bgHex: string): string {
  return isColorDark(bgHex) ? '#ffffff' : '#1a1a1a';
}

/** Build splash screen config from branding data. */
export function buildSplashConfig(
  branding: MobileBrandingData
): SplashScreenConfig {
  return {
    backgroundColor: branding.primaryColor,
    logoUrl: branding.logoUrl || '',
    orgName: branding.organizationName || DEFAULT_ORG_NAME,
    tagline: branding.tagline || '',
    lightStatusBar: isColorDark(branding.primaryColor),
  };
}

/** Build navigation bar style from branding. */
export function buildNavBarStyle(branding: MobileBrandingData): NavBarStyle {
  const bg = branding.primaryColor || DEFAULT_PRIMARY;
  const text = contrastColor(bg);
  return {
    backgroundColor: bg,
    tintColor: text,
    titleColor: text,
  };
}

/** Build app bar style from branding. */
export function buildAppBarStyle(branding: MobileBrandingData): AppBarStyle {
  const bg = branding.backgroundColor || '#ffffff';
  const text = contrastColor(bg);
  return {
    backgroundColor: bg,
    iconColor: branding.primaryColor || DEFAULT_PRIMARY,
    titleColor: text,
  };
}

/**
 * Hook for white-label mobile shell configuration.
 * Provides derived styling configs from tenant branding context.
 */
export function useWhiteLabel(): WhiteLabelConfig {
  const { branding, isLoading } = useMobileTheme();

  const isCustomBranded = useMemo(
    () =>
      branding.organizationName !== DEFAULT_ORG_NAME ||
      branding.primaryColor !== DEFAULT_PRIMARY,
    [branding.organizationName, branding.primaryColor]
  );

  const splashConfig = useMemo(() => buildSplashConfig(branding), [branding]);

  const navBarStyle = useMemo(() => buildNavBarStyle(branding), [branding]);

  const appBarStyle = useMemo(() => buildAppBarStyle(branding), [branding]);

  return {
    branding,
    isLoading,
    isCustomBranded,
    splashConfig,
    navBarStyle,
    appBarStyle,
  };
}
