import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/admin-language.queries', () => ({
  TENANT_LANGUAGE_SETTINGS_QUERY: 'TENANT_LANGUAGE_SETTINGS_QUERY',
  UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION: 'UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { LanguageSettingsPage } from './LanguageSettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function setupUrql(overrides: Record<string, unknown> = {}, fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { myTenantLanguageSettings: null },
      fetching,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    vi.fn().mockResolvedValue({ error: undefined }),
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LanguageSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    setupUrql();
  });

  it('renders the "Language Settings" heading', () => {
    renderPage();
    expect(screen.getByText('Language Settings')).toBeInTheDocument();
  });

  it('redirects to /dashboard when role is not admin', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('does not render content when redirecting non-admins', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(screen.queryByText('Language Settings')).not.toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    setupUrql({}, true);
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText(/loading language settings/i)).toBeInTheDocument();
  });

  it('renders the "Default Language" card', () => {
    renderPage();
    expect(screen.getByText('Default Language')).toBeInTheDocument();
  });

  it('renders the "Enabled Languages" card', () => {
    renderPage();
    expect(screen.getByText('Enabled Languages')).toBeInTheDocument();
  });

  it('shows all available locales as checkboxes', () => {
    renderPage();
    // Should have checkboxes for all 10 locales
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(10);
  });

  it('shows "RTL" badge for right-to-left languages', () => {
    renderPage();
    // Hebrew and Arabic are RTL
    const rtlBadges = screen.getAllByText('RTL');
    expect(rtlBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('renders "Save Changes" button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('English is checked by default (initial supported set)', () => {
    renderPage();
    // Find the English checkbox — it's the first one and is checked
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
  });

  it('English checkbox is disabled (it is the default language)', () => {
    renderPage();
    // default language checkbox is disabled
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeDisabled();
  });

  it('shows "default" badge next to the default language', () => {
    renderPage();
    expect(screen.getByText('default')).toBeInTheDocument();
  });

  it('renders the Preview section', () => {
    renderPage();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('clicking a language checkbox toggles its supported state', () => {
    renderPage();
    // Hebrew checkbox (index 1, not default, initially unchecked)
    const checkboxes = screen.getAllByRole('checkbox');
    const hebrewCheckbox = checkboxes[1] as HTMLElement;
    expect(hebrewCheckbox).not.toBeChecked();
    fireEvent.click(hebrewCheckbox);
    expect(hebrewCheckbox).toBeChecked();
  });

  it('shows success message after save', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/language settings saved/i)).toBeInTheDocument();
    });
  });

  it('shows error message when mutation fails', async () => {
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      vi.fn().mockResolvedValue({ error: { message: 'Server error' } }),
    ] as never);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
