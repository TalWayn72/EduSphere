import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock LanguageSelector — avoids pulling in Radix Select + i18n locale arrays
vi.mock('@/components/LanguageSelector', () => ({
  LanguageSelector: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="language-selector"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Language"
    >
      <option value="en">English</option>
      <option value="fr">French</option>
    </select>
  ),
}));

// Sonner toast mock — capture calls without side-effects
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// useUserPreferences mock — controlled per-test via setMockReturn()
const mockSetLocale = vi.fn();
let mockIsSaving = false;
let mockLocale = 'en';

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
    isSaving: mockIsSaving,
  }),
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { SettingsPage } from './SettingsPage';

// ── Helpers ────────────────────────────────────────────────────────────────

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  beforeEach(() => {
    mockSetLocale.mockReset();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockIsSaving = false;
    mockLocale = 'en';
  });

  it('renders the page heading "Settings"', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /settings/i })
    ).toBeInTheDocument();
  });

  it('renders the layout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders the LanguageSelector component', () => {
    renderPage();
    expect(screen.getByTestId('language-selector')).toBeInTheDocument();
  });

  it('passes the current locale to LanguageSelector as value', () => {
    mockLocale = 'fr';
    renderPage();
    const selector = screen.getByTestId(
      'language-selector'
    ) as HTMLSelectElement;
    expect(selector.value).toBe('fr');
  });

  it('shows saving indicator text while isSaving is true', () => {
    mockIsSaving = true;
    renderPage();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('does not show saving indicator when isSaving is false', () => {
    mockIsSaving = false;
    renderPage();
    expect(screen.queryByText(/saving\.\.\./i)).not.toBeInTheDocument();
  });

  it('disables LanguageSelector while isSaving is true', () => {
    mockIsSaving = true;
    renderPage();
    expect(screen.getByTestId('language-selector')).toBeDisabled();
  });

  it('calls setLocale when a new language is selected', async () => {
    mockSetLocale.mockResolvedValue(undefined);
    renderPage();
    fireEvent.change(screen.getByTestId('language-selector'), {
      target: { value: 'fr' },
    });
    await waitFor(() => expect(mockSetLocale).toHaveBeenCalledWith('fr'));
  });

  it('shows success toast after successful locale change', async () => {
    mockSetLocale.mockResolvedValue(undefined);
    renderPage();
    fireEvent.change(screen.getByTestId('language-selector'), {
      target: { value: 'es' },
    });
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith('Language preference saved')
    );
  });

  it('shows error toast when setLocale rejects', async () => {
    mockSetLocale.mockRejectedValue(new Error('Network error'));
    renderPage();
    fireEvent.change(screen.getByTestId('language-selector'), {
      target: { value: 'hi' },
    });
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Failed to save language preference. Please try again.'
      )
    );
  });

  it('renders the language card section title', () => {
    renderPage();
    // Card header renders 'language.title' → "Language" (from settings.json)
    expect(screen.getAllByText('Language').length).toBeGreaterThanOrEqual(1);
  });
});
