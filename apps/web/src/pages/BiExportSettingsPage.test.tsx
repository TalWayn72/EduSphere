import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/lib/graphql/bi-export.queries', () => ({
  BI_API_TOKENS_QUERY: 'BI_API_TOKENS_QUERY',
  GENERATE_BI_API_KEY_MUTATION: 'GENERATE_BI_API_KEY_MUTATION',
  REVOKE_BI_API_KEY_MUTATION: 'REVOKE_BI_API_KEY_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { BiExportSettingsPage } from './BiExportSettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TOKENS = [
  {
    id: 'tok-1',
    description: 'Power BI Production',
    isActive: true,
    createdAt: '2026-01-15T10:00:00Z',
    lastUsedAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'tok-2',
    description: 'Tableau Dev',
    isActive: false,
    createdAt: '2026-01-10T09:00:00Z',
    lastUsedAt: null,
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  tokens: typeof MOCK_TOKENS | [] = [],
  fetching = false
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { biApiTokens: tokens },
      fetching,
      error: undefined,
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
      <BiExportSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BiExportSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql([]);
  });

  it('renders "BI Tool Export" heading', () => {
    renderPage();
    expect(screen.getByText('BI Tool Export')).toBeInTheDocument();
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
    expect(screen.getByText('BI Tool Export')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('BI Tool Export')).toBeInTheDocument();
  });

  it('renders "OData Endpoints" card header', () => {
    renderPage();
    expect(screen.getByText('OData Endpoints')).toBeInTheDocument();
  });

  it('renders all 4 OData endpoint labels', () => {
    renderPage();
    expect(screen.getByText('Enrollments')).toBeInTheDocument();
    expect(screen.getByText('Completions')).toBeInTheDocument();
    expect(screen.getByText('Quiz Results')).toBeInTheDocument();
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
  });

  it('renders 4 Copy buttons for the endpoints', () => {
    renderPage();
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(4);
  });

  it('renders "API Tokens" card header', () => {
    renderPage();
    expect(screen.getByText('API Tokens')).toBeInTheDocument();
  });

  it('renders "Generate Token" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /generate token/i })
    ).toBeInTheDocument();
  });

  it('shows "No tokens yet" message when token list is empty', () => {
    setupUrql([]);
    renderPage();
    expect(
      screen.getByText(/no tokens yet/i)
    ).toBeInTheDocument();
  });

  it('shows loading indicator when tokens are fetching', () => {
    setupUrql([], true);
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('opens generate token modal when "Generate Token" is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    expect(screen.getByText('Generate BI API Token')).toBeInTheDocument();
  });

  it('shows "Description" label and input in the modal', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('has "Generate" button disabled when description is empty', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    // The Generate button inside the modal
    expect(
      screen.getByRole('button', { name: /^generate$/i })
    ).toBeDisabled();
  });

  it('renders token description when tokens exist', () => {
    setupUrql(MOCK_TOKENS);
    renderPage();
    expect(screen.getByText('Power BI Production')).toBeInTheDocument();
    expect(screen.getByText('Tableau Dev')).toBeInTheDocument();
  });

  it('shows "Active" and "Revoked" status badges for tokens', () => {
    setupUrql(MOCK_TOKENS);
    renderPage();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });
});
