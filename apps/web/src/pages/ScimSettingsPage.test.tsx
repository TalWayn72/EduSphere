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

vi.mock('@/lib/graphql/scim.queries', () => ({
  SCIM_TOKENS_QUERY: 'SCIM_TOKENS_QUERY',
  SCIM_SYNC_LOG_QUERY: 'SCIM_SYNC_LOG_QUERY',
  GENERATE_SCIM_TOKEN_MUTATION: 'GENERATE_SCIM_TOKEN_MUTATION',
  REVOKE_SCIM_TOKEN_MUTATION: 'REVOKE_SCIM_TOKEN_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ScimSettingsPage } from './ScimSettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TOKENS = [
  {
    id: 'tok-1',
    description: 'Workday Production',
    lastUsedAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const MOCK_LOG = [
  {
    id: 'log-1',
    operation: 'CREATE_USER',
    externalId: 'ext-001',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2024-03-01T10:00:00Z',
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  tokens: typeof MOCK_TOKENS | [] = [],
  log: typeof MOCK_LOG | [] = [],
  fetching = false
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { scimTokens: tokens, scimSyncLog: log },
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
      <ScimSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScimSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders the "SCIM / HRIS Integration" heading', () => {
    renderPage();
    expect(screen.getByText('SCIM / HRIS Integration')).toBeInTheDocument();
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
    expect(screen.getByText('SCIM / HRIS Integration')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('SCIM / HRIS Integration')).toBeInTheDocument();
  });

  it('renders "SCIM Endpoint" card', () => {
    renderPage();
    expect(screen.getByText('SCIM Endpoint')).toBeInTheDocument();
  });

  it('renders "API Tokens" card', () => {
    renderPage();
    expect(screen.getByText('API Tokens')).toBeInTheDocument();
  });

  it('renders "Sync Log" card', () => {
    renderPage();
    expect(screen.getByText('Sync Log')).toBeInTheDocument();
  });

  it('shows "No tokens yet" when token list is empty', () => {
    setupUrql([]);
    renderPage();
    expect(
      screen.getByText(/no tokens yet\. generate one to get started/i)
    ).toBeInTheDocument();
  });

  it('shows "No sync operations yet" when log is empty', () => {
    setupUrql([], []);
    renderPage();
    expect(screen.getByText(/no sync operations yet/i)).toBeInTheDocument();
  });

  it('renders "Generate Token" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /generate token/i })
    ).toBeInTheDocument();
  });

  it('opens generate token modal when button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
  });

  it('shows "Generate SCIM Token" dialog title after clicking Generate Token', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
    expect(screen.getByText('Generate SCIM Token')).toBeInTheDocument();
  });

  it('renders token description when tokens exist', () => {
    setupUrql(MOCK_TOKENS);
    renderPage();
    expect(screen.getByText('Workday Production')).toBeInTheDocument();
  });

  it('shows "Active" status badge for active tokens', () => {
    setupUrql(MOCK_TOKENS);
    renderPage();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders sync log operation when log has entries', () => {
    setupUrql([], MOCK_LOG);
    renderPage();
    expect(screen.getByText('CREATE_USER')).toBeInTheDocument();
  });

  it('renders SCIM endpoint URL containing /scim/v2', () => {
    renderPage();
    expect(screen.getByText(/\/scim\/v2/)).toBeInTheDocument();
  });

  it('renders "Copy" button for the endpoint', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });
});
