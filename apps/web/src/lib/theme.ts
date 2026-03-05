/**
 * EduSphere Theme Engine
 * 3-tier cascade: Platform defaults → Tenant theme → User preference
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type MotionPreference = 'full' | 'reduced' | 'none';
export type ContrastMode = 'normal' | 'high';

export interface ThemePrimitives {
  primary?: string; // HSL values, e.g. "239 84% 67%"
  accent?: string;
  background?: string;
  foreground?: string;
  card?: string;
  border?: string;
  radius?: string; // e.g. "0.75rem"
  [key: string]: string | undefined;
}

export interface UserThemePreferences {
  mode: ThemeMode;
  fontSize: FontSize;
  readingMode: boolean;
  motionPreference: MotionPreference;
  contrastMode: ContrastMode;
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

/**
 * Apply tenant theme primitives as CSS variables on documentElement.
 * Called once on app init and whenever tenant theme changes.
 */
export function applyTenantTheme(primitives: ThemePrimitives): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(primitives)) {
    if (value !== undefined) {
      root.style.setProperty(`--${key}`, value);
    }
  }
}

/**
 * Remove tenant theme overrides (revert to platform defaults).
 */
export function clearTenantTheme(primitives: ThemePrimitives): void {
  const root = document.documentElement;
  for (const key of Object.keys(primitives)) {
    root.style.removeProperty(`--${key}`);
  }
}

/**
 * Apply user preferences (mode, font size, motion, contrast).
 */
export function applyUserPreferences(prefs: UserThemePreferences): void {
  const root = document.documentElement;
  const html = document.documentElement;

  // Theme mode
  const resolvedMode =
    prefs.mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : prefs.mode;
  html.classList.toggle('dark', resolvedMode === 'dark');
  html.setAttribute('data-theme', resolvedMode);

  // Font size
  root.style.setProperty('font-size', FONT_SIZE_MAP[prefs.fontSize]);

  // Reading mode
  html.classList.toggle('reading-mode', prefs.readingMode);

  // Motion
  root.style.setProperty('--motion-preference', prefs.motionPreference);
  if (prefs.motionPreference !== 'full') {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }

  // Contrast
  html.classList.toggle('high-contrast', prefs.contrastMode === 'high');
}

/**
 * Resolve system theme mode to actual light/dark.
 */
export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

/**
 * Preview a theme change without saving (for settings UI).
 * Returns cleanup function.
 */
export function previewTheme(primitives: ThemePrimitives): () => void {
  applyTenantTheme(primitives);
  return () => clearTenantTheme(primitives);
}

/**
 * Read saved theme from localStorage (for FOUC prevention).
 */
export function getStoredThemeMode(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(
      'edusphere-theme-mode'
    ) as ThemeMode | null;
    if (stored) return resolveThemeMode(stored);
  } catch {
    // localStorage not available
  }
  return resolveThemeMode('system');
}
