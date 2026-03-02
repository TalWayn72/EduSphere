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

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/branding.queries', () => ({
  TENANT_BRANDING_QUERY: 'TENANT_BRANDING_QUERY',
  UPDATE_TENANT_BRANDING_MUTATION: 'UPDATE_TENANT_BRANDING_MUTATION',
}));

vi.mock('./BrandingSettingsPage.form', () => ({
  BrandingIdentityCard: vi.fn(() => <div data-testid="identity-card" />),
  BrandingLogosCard: vi.fn(() => <div data-testid="logos-card" />),
  BrandingColorsCard: vi.fn(() => <div data-testid="colors-card" />),
  BrandingMiscCard: vi.fn(() => <div data-testid="misc-card" />),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { BrandingSettingsPage } from './BrandingSettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SAVE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: { myTenantBranding: null }, fetching, error: undefined },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_SAVE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BrandingSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BrandingSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_SAVE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders the "Branding Settings" heading', () => {
    renderPage();
    expect(screen.getByText('Branding Settings')).toBeInTheDocument();
  });

  it('redirects to /dashboard for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('allows ORG_ADMIN to view the page', () => {
    renderPage();
    expect(screen.getByText('Branding Settings')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Branding Settings')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    setupUrql(true);
    renderPage();
    expect(screen.getByText(/loading branding settings/i)).toBeInTheDocument();
  });

  it('renders the "Save Changes" button when not loading', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /save changes/i })
    ).toBeInTheDocument();
  });

  it('renders all four branding section cards', () => {
    renderPage();
    expect(screen.getByTestId('identity-card')).toBeInTheDocument();
    expect(screen.getByTestId('logos-card')).toBeInTheDocument();
    expect(screen.getByTestId('colors-card')).toBeInTheDocument();
    expect(screen.getByTestId('misc-card')).toBeInTheDocument();
  });

  it('shows success message after saving', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/branding saved successfully/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error message when save fails', async () => {
    MOCK_SAVE.mockResolvedValue({ error: { message: 'Save failed' } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('calls the update mutation when Save is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(MOCK_SAVE).toHaveBeenCalledOnce();
    });
  });
});
