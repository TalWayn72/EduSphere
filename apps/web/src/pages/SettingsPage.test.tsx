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

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

// Mock urql useMutation (PrivacyConsentCard calls updateConsent mutation)
const mockMutate = vi.fn().mockResolvedValue({ data: { updateConsent: true } });
vi.mock('urql', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('urql');
  return { ...actual, useMutation: () => [{ fetching: false }, mockMutate] };
});

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

const renderPage = (initialEntries: string[] = ['/settings']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <SettingsPage />
    </MemoryRouter>
  );

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  beforeEach(() => {
    mockSetLocale.mockReset();
    mockMutate.mockReset().mockResolvedValue({ data: { updateConsent: true } });
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockClearLocalStorage.mockReset().mockReturnValue(0);
    mockIsSaving = false;
    mockLocale = 'en';
    mockStorageStats = null;
    mockStorageLoading = false;
    localStorage.clear();
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

  // BUG-087 REGRESSION: settings page with ?highlight=ai-consent must NOT crash
  it('REGRESSION BUG-087: renders without crash when ?highlight=ai-consent is in URL', () => {
    mockStorageStats = {
      usageRatio: 0.1,
      isApproachingLimit: false,
      isOverLimit: false,
      isUnsupported: false,
      eduSphereUsedBytes: 100,
      eduSphereQuotaBytes: 1000,
    };
    renderPage(['/settings?highlight=ai-consent']);
    // Page must NOT show ErrorBoundary "Something went wrong"
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    // Privacy & AI card must be visible
    expect(screen.getByText(/privacy/i)).toBeInTheDocument();
    // AI consent toggle must be present
    expect(document.getElementById('setting-ai-consent')).toBeInTheDocument();
  });

  it('REGRESSION BUG-087: "Something went wrong" is never shown on settings page', () => {
    renderPage(['/settings']);
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  // BUG-088 REGRESSION: consent toggle must call updateConsent mutation
  it('REGRESSION BUG-088: toggling AI consent calls GraphQL mutation', async () => {
    renderPage();
    const toggle = screen.getAllByRole('switch')[0]; // first switch = AI Processing
    fireEvent.click(toggle);
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
    const callArgs = mockMutate.mock.calls[0][0];
    expect(callArgs).toEqual({
      input: { consentType: 'AI_PROCESSING', given: true },
    });
  });

  it('REGRESSION BUG-088: consent toggle saves to localStorage', () => {
    renderPage();
    const toggle = screen.getAllByRole('switch')[0];
    fireEvent.click(toggle);
    expect(localStorage.getItem('edusphere_consent_AI_PROCESSING')).toBe(
      'true'
    );
  });

  it('REGRESSION BUG-088: back button shown when returnTo param present', () => {
    renderPage(['/settings?highlight=ai-consent&returnTo=%2Fcourses%2Fnew']);
    const backBtn = screen.getByRole('button', { name: /back/i });
    expect(backBtn).toBeInTheDocument();
  });

  it('REGRESSION BUG-088: no back button without returnTo param', () => {
    renderPage(['/settings']);
    expect(
      screen.queryByRole('button', { name: /back/i })
    ).not.toBeInTheDocument();
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
