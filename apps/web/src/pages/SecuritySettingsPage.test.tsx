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
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AdminLayout: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/security.queries', () => ({
  SECURITY_SETTINGS_QUERY: 'SECURITY_SETTINGS_QUERY',
  UPDATE_SECURITY_SETTINGS_MUTATION: 'UPDATE_SECURITY_SETTINGS_MUTATION',
}));

vi.mock('./SecuritySettingsPage.sections', () => ({
  MfaSection: vi.fn(() => <div data-testid="mfa-section" />),
  SessionSection: vi.fn(() => <div data-testid="session-section" />),
  PasswordSection: vi.fn(() => <div data-testid="password-section" />),
  AccessControlSection: vi.fn(() => (
    <div data-testid="access-control-section" />
  )),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { SecuritySettingsPage } from './SecuritySettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(overrides: Record<string, unknown> = {}, fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { mySecuritySettings: null },
      fetching,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SecuritySettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SecuritySettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders "Security Settings" heading via AdminLayout title', () => {
    renderPage();
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
  });

  it('redirects to /dashboard for non-admin roles', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('returns null content for non-admin roles', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(screen.queryByText('Save Settings')).not.toBeInTheDocument();
  });

  it('allows ORG_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(screen.getByText('Save Settings')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Save Settings')).toBeInTheDocument();
  });

  it('shows loading text while fetching', () => {
    setupUrql({}, true);
    renderPage();
    expect(screen.getByText(/loading settings/i)).toBeInTheDocument();
  });

  it('renders MfaSection when not loading', () => {
    renderPage();
    expect(screen.getByTestId('mfa-section')).toBeInTheDocument();
  });

  it('renders SessionSection when not loading', () => {
    renderPage();
    expect(screen.getByTestId('session-section')).toBeInTheDocument();
  });

  it('renders PasswordSection when not loading', () => {
    renderPage();
    expect(screen.getByTestId('password-section')).toBeInTheDocument();
  });

  it('renders AccessControlSection when not loading', () => {
    renderPage();
    expect(screen.getByTestId('access-control-section')).toBeInTheDocument();
  });

  it('renders "Save Settings" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /save settings/i })
    ).toBeInTheDocument();
  });

  it('shows "Settings saved." after successful save', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => {
      expect(screen.getByText('Settings saved.')).toBeInTheDocument();
    });
  });

  it('calls the mutation when Save is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => {
      expect(MOCK_EXECUTE).toHaveBeenCalledOnce();
    });
  });
});
