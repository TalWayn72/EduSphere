/**
 * BrandedSplashScreen — Splash screen configuration using org branding.
 * Pure logic module — no React Native UI components.
 * Provides configuration objects consumed by Expo's SplashScreen API
 * and the app's root layout for branded cold-start experience.
 */

export interface SplashScreenOptions {
  /** Background color for the splash screen */
  backgroundColor: string;
  /** URL of the logo to display */
  logoUrl: string;
  /** Resize mode for the logo image */
  logoResizeMode: 'contain' | 'cover' | 'center';
  /** Organization name shown as splash text */
  orgName: string;
  /** Tagline below the org name */
  tagline: string;
  /** Duration in ms before auto-hide (0 = manual control) */
  autoHideMs: number;
  /** Whether to use a light status bar style */
  lightStatusBar: boolean;
  /** Whether splash has custom branding (not defaults) */
  isCustomBranded: boolean;
}

export interface BrandingInput {
  primaryColor: string;
  logoUrl: string;
  organizationName: string;
  tagline?: string | null;
}

const DEFAULT_ORG_NAME = 'EduSphere';
const DEFAULT_PRIMARY = '#2563eb';
const DEFAULT_AUTO_HIDE_MS = 1500;
const CUSTOM_AUTO_HIDE_MS = 2000;

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

/** Determine if branding represents custom org config vs defaults. */
export function isCustomBranding(input: BrandingInput): boolean {
  return (
    input.organizationName !== DEFAULT_ORG_NAME ||
    input.primaryColor !== DEFAULT_PRIMARY ||
    input.logoUrl !== ''
  );
}

/** Validate a hex color string. Returns the color or a fallback. */
export function validateHexColor(
  hex: string,
  fallback: string = DEFAULT_PRIMARY
): string {
  const pattern = /^#[0-9a-fA-F]{6}$/;
  return pattern.test(hex) ? hex : fallback;
}

/**
 * Build splash screen options from branding input.
 * Pure function — no side effects, no React Native imports.
 */
export function buildSplashScreenOptions(
  input: BrandingInput
): SplashScreenOptions {
  const bgColor = validateHexColor(input.primaryColor);
  const custom = isCustomBranding(input);

  return {
    backgroundColor: bgColor,
    logoUrl: input.logoUrl || '',
    logoResizeMode: input.logoUrl ? 'contain' : 'center',
    orgName: input.organizationName || DEFAULT_ORG_NAME,
    tagline: input.tagline || '',
    autoHideMs: custom ? CUSTOM_AUTO_HIDE_MS : DEFAULT_AUTO_HIDE_MS,
    lightStatusBar: isColorDark(bgColor),
    isCustomBranded: custom,
  };
}

/**
 * Compute the fade-in animation delay based on branding state.
 * Custom-branded splash screens show longer to display org branding.
 */
export function computeAnimationDelay(isCustom: boolean): number {
  return isCustom ? 800 : 400;
}

/**
 * Build a safe display string for the splash tagline.
 * Truncates overly long taglines for splash screen fit.
 */
export function formatSplashTagline(
  tagline: string | null | undefined,
  maxLength: number = 80
): string {
  if (!tagline) return '';
  const trimmed = tagline.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.substring(0, maxLength - 3)}...`;
}
