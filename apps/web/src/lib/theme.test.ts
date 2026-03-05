import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyTenantTheme,
  clearTenantTheme,
  applyUserPreferences,
  resolveThemeMode,
  previewTheme,
  getStoredThemeMode,
} from './theme';
import type { ThemePrimitives, UserThemePreferences } from './theme';

// ── matchMedia stub ──────────────────────────────────────────────────────────
function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('applyTenantTheme', () => {
  beforeEach(() => {
    // Reset inline styles before each test
    document.documentElement.removeAttribute('style');
  });

  it('sets CSS variables on documentElement for each primitive', () => {
    const primitives: ThemePrimitives = {
      primary: '239 84% 67%',
      background: '0 0% 100%',
      radius: '0.75rem',
    };
    applyTenantTheme(primitives);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--primary')).toBe('239 84% 67%');
    expect(style.getPropertyValue('--background')).toBe('0 0% 100%');
    expect(style.getPropertyValue('--radius')).toBe('0.75rem');
  });

  it('skips undefined values', () => {
    const primitives: ThemePrimitives = { primary: undefined, accent: '200 80% 50%' };
    applyTenantTheme(primitives);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('200 80% 50%');
  });
});

describe('clearTenantTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('removes previously set CSS variables', () => {
    const primitives: ThemePrimitives = { primary: '239 84% 67%', border: '214 31% 91%' };
    applyTenantTheme(primitives);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('239 84% 67%');

    clearTenantTheme(primitives);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--border')).toBe('');
  });

  it('is a no-op for empty primitives', () => {
    clearTenantTheme({});
    // Should not throw
    expect(document.documentElement.style.length).toBe(0);
  });
});

describe('resolveThemeMode', () => {
  it('returns "dark" when mode is "dark"', () => {
    mockMatchMedia(false);
    expect(resolveThemeMode('dark')).toBe('dark');
  });

  it('returns "light" when mode is "light"', () => {
    mockMatchMedia(true);
    expect(resolveThemeMode('light')).toBe('light');
  });

  it('returns "dark" for "system" when prefers-color-scheme is dark', () => {
    mockMatchMedia(true);
    expect(resolveThemeMode('system')).toBe('dark');
  });

  it('returns "light" for "system" when prefers-color-scheme is light', () => {
    mockMatchMedia(false);
    expect(resolveThemeMode('system')).toBe('light');
  });
});

describe('applyUserPreferences', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  const basePrefs: UserThemePreferences = {
    mode: 'light',
    fontSize: 'md',
    readingMode: false,
    motionPreference: 'full',
    contrastMode: 'normal',
  };

  it('toggles .dark class when mode is dark', () => {
    applyUserPreferences({ ...basePrefs, mode: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes .dark class when mode is light', () => {
    document.documentElement.classList.add('dark');
    applyUserPreferences({ ...basePrefs, mode: 'light' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('sets data-theme attribute to resolved mode', () => {
    applyUserPreferences({ ...basePrefs, mode: 'dark' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('sets font-size CSS variable from fontSize map', () => {
    applyUserPreferences({ ...basePrefs, fontSize: 'lg' });
    expect(document.documentElement.style.getPropertyValue('font-size')).toBe('18px');
  });

  it('toggles .reading-mode class', () => {
    applyUserPreferences({ ...basePrefs, readingMode: true });
    expect(document.documentElement.classList.contains('reading-mode')).toBe(true);
    applyUserPreferences({ ...basePrefs, readingMode: false });
    expect(document.documentElement.classList.contains('reading-mode')).toBe(false);
  });

  it('adds .reduce-motion when motionPreference is reduced', () => {
    applyUserPreferences({ ...basePrefs, motionPreference: 'reduced' });
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
  });

  it('removes .reduce-motion when motionPreference is full', () => {
    document.documentElement.classList.add('reduce-motion');
    applyUserPreferences({ ...basePrefs, motionPreference: 'full' });
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
  });

  it('toggles .high-contrast class', () => {
    applyUserPreferences({ ...basePrefs, contrastMode: 'high' });
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    applyUserPreferences({ ...basePrefs, contrastMode: 'normal' });
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
  });
});

describe('previewTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('applies primitives and returns cleanup that removes them', () => {
    const primitives: ThemePrimitives = { primary: '100 50% 50%' };
    const cleanup = previewTheme(primitives);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('100 50% 50%');
    cleanup();
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
  });
});

describe('getStoredThemeMode', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });

  it('returns "light" when no stored value and system prefers light', () => {
    mockMatchMedia(false);
    expect(getStoredThemeMode()).toBe('light');
  });

  it('returns "dark" when no stored value and system prefers dark', () => {
    mockMatchMedia(true);
    expect(getStoredThemeMode()).toBe('dark');
  });

  it('returns "dark" when stored mode is "dark"', () => {
    localStorage.setItem('edusphere-theme-mode', 'dark');
    expect(getStoredThemeMode()).toBe('dark');
  });

  it('returns "light" when stored mode is "light"', () => {
    mockMatchMedia(true); // system prefers dark, but stored is light
    localStorage.setItem('edusphere-theme-mode', 'light');
    expect(getStoredThemeMode()).toBe('light');
  });

  it('falls back to system resolution when stored mode is "system"', () => {
    mockMatchMedia(true);
    localStorage.setItem('edusphere-theme-mode', 'system');
    expect(getStoredThemeMode()).toBe('dark');
  });
});
