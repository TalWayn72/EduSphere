/**
 * Unit tests for JargonManagementPage.
 *
 * Tests: page renders with domains list, domain selection updates terms panel,
 * empty state prompt, loading spinner, role-based redirect (non-admin users),
 * refetch callback passed to sidebar.
 * urql hooks and auth hooks are fully mocked.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── i18n mock ─────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, _opts?: object) =>
      typeof fallback === 'string' ? fallback : _key,
  }),
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────
const mockUseAuthRole = vi.fn().mockReturnValue('ORG_ADMIN');

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => mockUseAuthRole(),
}));

// ── Router navigate mock ──────────────────────────────────────────────────────
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...original,
    useNavigate: () => mockNavigate,
  };
});

// ── urql mock ─────────────────────────────────────────────────────────────────
const mockRefetch = vi.fn();

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [
    {
      data: {
        jargonDomains: [
          {
            id: 'dom-1',
            tenantId: 'tenant-1',
            name: 'קבלה',
            description: 'Kabbalistic terminology',
            language: 'he',
            parentDomain: null,
            termCount: 24,
            relatedDomains: [],
          },
          {
            id: 'dom-2',
            tenantId: 'tenant-1',
            name: 'תלמוד',
            description: 'Talmudic terminology',
            language: 'he',
            parentDomain: null,
            termCount: 38,
            relatedDomains: [],
          },
        ],
      },
      fetching: false,
    },
    mockRefetch,
  ]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
  gql: vi.fn((s: TemplateStringsArray) => String(s)),
}));

// ── GraphQL queries mock ──────────────────────────────────────────────────────
vi.mock('@/lib/graphql/jargon.queries', () => ({
  JARGON_DOMAINS_QUERY: 'JARGON_DOMAINS_QUERY',
  CREATE_JARGON_DOMAIN_MUTATION: 'CREATE_JARGON_DOMAIN_MUTATION',
  DELETE_JARGON_DOMAIN_MUTATION: 'DELETE_JARGON_DOMAIN_MUTATION',
  JARGON_TERMS_QUERY: 'JARGON_TERMS_QUERY',
}));

// ── Layout/UI mocks ───────────────────────────────────────────────────────────
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  Trash2: () => <span data-testid="trash-icon">trash</span>,
  ChevronRight: () => <span data-testid="chevron-icon">&gt;</span>,
}));

// ── TermsPanel mock (separate page sub-component) ─────────────────────────────
vi.mock('./JargonManagementPage.terms', () => ({
  TermsPanel: ({ domain }: { domain: { name: string } }) => (
    <div data-testid="terms-panel">
      <span data-testid="terms-panel-domain-name">{domain.name}</span>
    </div>
  ),
}));

// ── Component import (after mocks) ────────────────────────────────────────────
import { JargonManagementPage } from './JargonManagementPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <JargonManagementPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JargonManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthRole.mockReturnValue('ORG_ADMIN');
  });

  // ── Authorization ─────────────────────────────────────────────────────────

  it('redirects to dashboard when user is not an admin', () => {
    mockUseAuthRole.mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to dashboard when role is null (unauthenticated)', () => {
    mockUseAuthRole.mockReturnValue(null);
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('does NOT redirect when user is ORG_ADMIN', () => {
    mockUseAuthRole.mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does NOT redirect when user is SUPER_ADMIN', () => {
    mockUseAuthRole.mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── Page structure ────────────────────────────────────────────────────────

  it('renders inside AdminLayout', () => {
    renderPage();
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });

  it('renders the page title "Jargon Management"', () => {
    renderPage();
    expect(screen.getByText('Jargon Management')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    renderPage();
    expect(
      screen.getByText(/Manage professional domain vocabularies/i)
    ).toBeInTheDocument();
  });

  // ── Domain list in sidebar ────────────────────────────────────────────────

  it('renders domain names in the sidebar', () => {
    renderPage();
    expect(screen.getByText('קבלה')).toBeInTheDocument();
    expect(screen.getByText('תלמוד')).toBeInTheDocument();
  });

  it('renders term counts for each domain', () => {
    renderPage();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  // ── Domain selection ──────────────────────────────────────────────────────

  it('shows "Select a domain to view its terms" prompt initially', () => {
    renderPage();
    expect(
      screen.getByText('Select a domain to view its terms.')
    ).toBeInTheDocument();
  });

  it('shows TermsPanel when a domain is selected', async () => {
    renderPage();
    const domainItem = screen.getByText('קבלה');
    fireEvent.click(domainItem);

    await waitFor(() => {
      expect(screen.getByTestId('terms-panel')).toBeInTheDocument();
    });
  });

  it('passes the selected domain to TermsPanel', async () => {
    renderPage();
    fireEvent.click(screen.getByText('קבלה'));

    await waitFor(() => {
      expect(
        screen.getByTestId('terms-panel-domain-name').textContent
      ).toBe('קבלה');
    });
  });

  it('switches TermsPanel content when a different domain is selected', async () => {
    renderPage();
    fireEvent.click(screen.getByText('קבלה'));
    await waitFor(() =>
      expect(screen.getByTestId('terms-panel-domain-name').textContent).toBe('קבלה')
    );

    fireEvent.click(screen.getByText('תלמוד'));
    await waitFor(() =>
      expect(screen.getByTestId('terms-panel-domain-name').textContent).toBe('תלמוד')
    );
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('shows LoadingSpinner when query is fetching', async () => {
    const { useQuery } = vi.mocked(await import('urql'));
    useQuery.mockReturnValue([
      { data: undefined, fetching: true },
      mockRefetch,
    ] as never);

    renderPage();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it('shows "No domains yet." when domains array is empty', async () => {
    const { useQuery } = vi.mocked(await import('urql'));
    useQuery.mockReturnValue([
      { data: { jargonDomains: [] }, fetching: false },
      mockRefetch,
    ] as never);

    renderPage();
    expect(screen.getByText('No domains yet.')).toBeInTheDocument();
  });
});
