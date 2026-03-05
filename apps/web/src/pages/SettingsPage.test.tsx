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

// useStorageManager mock — controlled per-test via mockStorageStats
const mockClearLocalStorage = vi.fn().mockReturnValue(0);
let mockStorageStats: {
  usageRatio: number;
  isApproachingLimit: boolean;
  isOverLimit: boolean;
  isUnsupported: boolean;
  eduSphereUsedBytes: number;
  eduSphereQuotaBytes: number;
} | null = null;
let mockStorageLoading = false;

vi.mock('@/hooks/useStorageManager', () => ({
  useStorageManager: () => ({
    stats: mockStorageStats,
    isLoading: mockStorageLoading,
    clearLocalStorage: mockClearLocalStorage,
  }),
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
    mockClearLocalStorage.mockReset().mockReturnValue(0);
    mockIsSaving = false;
    mockLocale = 'en';
    mockStorageStats = null;
    mockStorageLoading = false;
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

  // ── Storage card tests ────────────────────────────────────────────────────

  it('hides the storage card when stats.isUnsupported is true', () => {
    mockStorageStats = {
      usageRatio: 0,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: true,
      eduSphereUsedBytes: 0,
      eduSphereQuotaBytes: 0,
    };
    renderPage();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows loading skeleton while storageLoading is true', () => {
    mockStorageLoading = true;
    mockStorageStats = {
      usageRatio: 0,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: false,
      eduSphereUsedBytes: 0,
      eduSphereQuotaBytes: 1024 * 1024,
    };
    const { container } = renderPage();
    // Skeleton rendered — progressbar not yet shown
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders progressbar when storage stats are available', () => {
    mockStorageStats = {
      usageRatio: 0.1,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: false,
      eduSphereUsedBytes: 100,
      eduSphereQuotaBytes: 1000,
    };
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // BUG-054 REGRESSION: progress bar must reflect actual value, not appear full at 0%
  it('REGRESSION BUG-054: at 0% usage, indicator is at translateX(-100%) — bar is empty', () => {
    mockStorageStats = {
      usageRatio: 0,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: false,
      eduSphereUsedBytes: 1016,
      eduSphereQuotaBytes: 897 * 1024 * 1024,
    };
    renderPage();
    const bar = screen.getByRole('progressbar');
    const indicator = bar.firstElementChild as HTMLElement;
    // Bar must be effectively invisible — pushed off-screen left
    expect(indicator.style.transform).toBe('translateX(-100%)');
  });

  it('REGRESSION BUG-054: container does NOT carry barColor (bg-primary/bg-destructive)', () => {
    mockStorageStats = {
      usageRatio: 0,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: false,
      eduSphereUsedBytes: 1016,
      eduSphereQuotaBytes: 897 * 1024 * 1024,
    };
    renderPage();
    const bar = screen.getByRole('progressbar');
    // Container must not have solid color class — that would make it appear full
    expect(bar.className).not.toMatch(/\bbg-primary\b(?!\/)(?!\/20)/);
    expect(bar.className).not.toContain('bg-destructive');
    expect(bar.className).not.toContain('bg-yellow-500');
  });

  it('shows 50% progress correctly: indicator at translateX(-50%)', () => {
    mockStorageStats = {
      usageRatio: 0.5,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: false,
      eduSphereUsedBytes: 500,
      eduSphereQuotaBytes: 1000,
    };
    renderPage();
    const bar = screen.getByRole('progressbar');
    const indicator = bar.firstElementChild as HTMLElement;
    expect(indicator.style.transform).toBe('translateX(-50%)');
  });

  it('calls clearLocalStorage and shows success toast on clear cache click', () => {
    mockClearLocalStorage.mockReturnValue(2048);
    mockStorageStats = {
      usageRatio: 0.3,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: false,
      eduSphereUsedBytes: 300,
      eduSphereQuotaBytes: 1000,
    };
    renderPage();
    const clearBtn = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearBtn);
    expect(mockClearLocalStorage).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalled();
  });
});
