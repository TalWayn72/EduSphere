/**
 * ThemeSettingsPage helpers — color conversion and constants.
 */
import type { ThemeMode, FontSize } from '@/lib/theme';

export const THEME_MODES: {
  value: ThemeMode;
  label: string;
  iconName: string;
}[] = [
  { value: 'light', label: 'Light', iconName: 'Sun' },
  { value: 'dark', label: 'Dark', iconName: 'Moon' },
  { value: 'system', label: 'System', iconName: 'Monitor' },
];

export const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

/**
 * Convert a CSS hex colour string (e.g. "#6366f1") to HSL component string
 * for use as a CSS variable value (e.g. "239 84% 67%").
 * Uses a best-effort approximation — production would use a proper colour lib.
 */
export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
