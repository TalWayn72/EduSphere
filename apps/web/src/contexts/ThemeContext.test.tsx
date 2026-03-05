import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

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

// Helper component that reads context and renders key values
function ThemeConsumer() {
  const {
    resolvedMode,
    userPreferences,
    setThemeMode,
    setFontSize,
    setReadingMode,
    setMotionPreference,
  } = useTheme();

  return (
    <div>
      <span data-testid="resolved-mode">{resolvedMode}</span>
      <span data-testid="font-size">{userPreferences.fontSize}</span>
      <span data-testid="reading-mode">{String(userPreferences.readingMode)}</span>
      <span data-testid="motion">{userPreferences.motionPreference}</span>
      <button onClick={() => setThemeMode('dark')} data-testid="set-dark">dark</button>
      <button onClick={() => setThemeMode('light')} data-testid="set-light">light</button>
      <button onClick={() => setFontSize('lg')} data-testid="set-lg">lg</button>
      <button onClick={() => setReadingMode(true)} data-testid="set-reading">reading</button>
      <button onClick={() => setMotionPreference('reduced')} data-testid="set-reduced">reduced</button>
    </div>
  );
}

// Component that intentionally calls useTheme outside provider
function BareConsumer() {
  useTheme();
  return null;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders children without crashing', () => {
    render(
      <ThemeProvider>
        <span data-testid="child">hello</span>
      </ThemeProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides default userPreferences (system mode, md font)', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('font-size').textContent).toBe('md');
    expect(screen.getByTestId('reading-mode').textContent).toBe('false');
    expect(screen.getByTestId('motion').textContent).toBe('full');
  });

  it('resolvedMode is "light" when system prefers light', () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('resolved-mode').textContent).toBe('light');
  });

  it('resolvedMode is "dark" when system prefers dark and mode is system', () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('resolved-mode').textContent).toBe('dark');
  });

  it('setThemeMode to dark changes resolvedMode to dark', async () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('resolved-mode').textContent).toBe('light');

    await act(async () => {
      screen.getByTestId('set-dark').click();
    });

    expect(screen.getByTestId('resolved-mode').textContent).toBe('dark');
  });

  it('setThemeMode to light changes resolvedMode to light even if system prefers dark', async () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    // system dark → resolvedMode should be dark initially
    expect(screen.getByTestId('resolved-mode').textContent).toBe('dark');

    await act(async () => {
      screen.getByTestId('set-light').click();
    });

    expect(screen.getByTestId('resolved-mode').textContent).toBe('light');
  });

  it('setFontSize updates userPreferences.fontSize', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('font-size').textContent).toBe('md');

    await act(async () => {
      screen.getByTestId('set-lg').click();
    });

    expect(screen.getByTestId('font-size').textContent).toBe('lg');
  });

  it('setReadingMode enables reading mode', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('reading-mode').textContent).toBe('false');

    await act(async () => {
      screen.getByTestId('set-reading').click();
    });

    expect(screen.getByTestId('reading-mode').textContent).toBe('true');
  });

  it('setMotionPreference updates motionPreference', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('motion').textContent).toBe('full');

    await act(async () => {
      screen.getByTestId('set-reduced').click();
    });

    expect(screen.getByTestId('motion').textContent).toBe('reduced');
  });

  it('persists preferences to localStorage on change', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await act(async () => {
      screen.getByTestId('set-dark').click();
    });

    const stored = JSON.parse(localStorage.getItem('edusphere-user-prefs') ?? '{}');
    expect(stored.mode).toBe('dark');
  });

  it('reads persisted preferences from localStorage on mount', () => {
    localStorage.setItem(
      'edusphere-user-prefs',
      JSON.stringify({ mode: 'dark', fontSize: 'xl', readingMode: false, motionPreference: 'full', contrastMode: 'normal' })
    );
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('resolved-mode').textContent).toBe('dark');
    expect(screen.getByTestId('font-size').textContent).toBe('xl');
  });
});

describe('useTheme outside provider', () => {
  it('throws an error with a descriptive message', () => {
    // Suppress the React error boundary console output in the test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BareConsumer />)).toThrow(
      'useTheme must be used inside ThemeProvider'
    );
    consoleSpy.mockRestore();
  });
});
