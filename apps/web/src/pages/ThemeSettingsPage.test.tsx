import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ThemeMode, FontSize } from '@/lib/theme';

// ── Mock ThemeContext ──────────────────────────────────────────────────────────

const mockSetThemeMode = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetReadingMode = vi.fn();
const mockSetMotionPreference = vi.fn();
const mockPreviewThemeChanges = vi.fn(() => vi.fn());

const mockUserPreferences = {
  mode: 'system' as ThemeMode,
  fontSize: 'md' as FontSize,
  readingMode: false,
  motionPreference: 'full' as const,
  contrastMode: 'normal' as const,
};

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    userPreferences: mockUserPreferences,
    resolvedMode: 'light',
    tenantPrimitives: {},
    setThemeMode: mockSetThemeMode,
    setFontSize: mockSetFontSize,
    setReadingMode: mockSetReadingMode,
    setMotionPreference: mockSetMotionPreference,
    previewThemeChanges: mockPreviewThemeChanges,
    setTenantTheme: vi.fn(),
  })),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { ThemeSettingsPage } from './ThemeSettingsPage';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ThemeSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<ThemeSettingsPage />);
    expect(
      screen.getByText('Theme & Appearance Settings')
    ).toBeInTheDocument();
  });

  it('renders all 3 theme mode options (Light, Dark, System)', () => {
    render(<ThemeSettingsPage />);
    const selector = screen.getByTestId('theme-mode-selector');
    expect(selector).toBeInTheDocument();
    expect(screen.getByLabelText('Light')).toBeInTheDocument();
    expect(screen.getByLabelText('Dark')).toBeInTheDocument();
    expect(screen.getByLabelText('System')).toBeInTheDocument();
  });

  it('renders font size options (Small, Medium, Large, Extra Large)', () => {
    render(<ThemeSettingsPage />);
    const selector = screen.getByTestId('font-size-selector');
    expect(selector).toBeInTheDocument();
    expect(screen.getByLabelText('Small')).toBeInTheDocument();
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('Large')).toBeInTheDocument();
    expect(screen.getByLabelText('Extra Large')).toBeInTheDocument();
  });

  it('renders the motion toggle with correct data-testid', () => {
    render(<ThemeSettingsPage />);
    expect(screen.getByTestId('motion-toggle')).toBeInTheDocument();
  });

  it('renders the contrast toggle with correct data-testid', () => {
    render(<ThemeSettingsPage />);
    expect(screen.getByTestId('contrast-toggle')).toBeInTheDocument();
  });

  it('renders the reading mode toggle with correct data-testid', () => {
    render(<ThemeSettingsPage />);
    expect(screen.getByTestId('reading-mode-toggle')).toBeInTheDocument();
  });

  it('renders the brand colour picker with correct data-testid', () => {
    render(<ThemeSettingsPage />);
    expect(screen.getByTestId('brand-color-picker')).toBeInTheDocument();
  });

  it('renders the reset button with correct data-testid', () => {
    render(<ThemeSettingsPage />);
    expect(screen.getByTestId('reset-theme-btn')).toBeInTheDocument();
  });

  it('calls setThemeMode when a theme mode radio is changed', () => {
    render(<ThemeSettingsPage />);
    fireEvent.click(screen.getByLabelText('Dark'));
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('calls setFontSize when a font size radio is changed', () => {
    render(<ThemeSettingsPage />);
    fireEvent.click(screen.getByLabelText('Large'));
    expect(mockSetFontSize).toHaveBeenCalledWith('lg');
  });

  it('does not render raw technical strings (no stack traces or urql internals)', () => {
    render(<ThemeSettingsPage />);
    expect(document.body.textContent).not.toMatch(/\[Network\]/);
    expect(document.body.textContent).not.toMatch(/CombinedError/);
    expect(document.body.textContent).not.toMatch(/GraphQLError/);
    expect(document.body.textContent).not.toMatch(/TypeError:/);
  });

  it('calls setThemeMode("system") when reset is clicked', () => {
    render(<ThemeSettingsPage />);
    fireEvent.click(screen.getByTestId('reset-theme-btn'));
    expect(mockSetThemeMode).toHaveBeenCalledWith('system');
    expect(mockSetFontSize).toHaveBeenCalledWith('md');
    expect(mockSetReadingMode).toHaveBeenCalledWith(false);
    expect(mockSetMotionPreference).toHaveBeenCalledWith('full');
  });
});
