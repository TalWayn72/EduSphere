import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/lib/graphql/crm.queries', () => ({
  CRM_CONNECTION_QUERY: 'CRM_CONNECTION_QUERY',
  CRM_SYNC_LOG_QUERY: 'CRM_SYNC_LOG_QUERY',
  DISCONNECT_CRM_MUTATION: 'DISCONNECT_CRM_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CrmSettingsPage } from './CrmSettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CONNECTION = {
  id: 'conn-1',
  provider: 'salesforce',
  instanceUrl: 'https://myorg.salesforce.com',
  isActive: true,
  createdAt: '2026-01-15T10:00:00Z',
};

const MOCK_SYNC_LOG = [
  {
    id: 'log-1',
    operation: 'UPSERT_CONTACT',
    externalId: '003XX000001AAA',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'log-2',
    operation: 'UPSERT_CONTACT',
    externalId: null,
    status: 'FAILED',
    errorMessage: 'Duplicate value',
    createdAt: '2026-02-21T09:00:00Z',
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  connection: typeof MOCK_CONNECTION | null = null,
  syncLog: typeof MOCK_SYNC_LOG | [] = [],
  fetching = false
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: {
        crmConnection: connection,
        crmSyncLog: syncLog,
      },
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
      <CrmSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CrmSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders "Salesforce CRM Integration" heading', () => {
    renderPage();
    expect(screen.getByText('Salesforce CRM Integration')).toBeInTheDocument();
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
    expect(screen.getByText('Salesforce CRM Integration')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Salesforce CRM Integration')).toBeInTheDocument();
  });

  it('renders "Connection Status" card title', () => {
    renderPage();
    expect(screen.getByText('Connection Status')).toBeInTheDocument();
  });

  it('renders "Webhook URL" card title', () => {
    renderPage();
    expect(screen.getByText('Webhook URL')).toBeInTheDocument();
  });

  it('renders "Sync Log" card title', () => {
    renderPage();
    expect(screen.getByText('Sync Log')).toBeInTheDocument();
  });

  it('shows "Not connected" when no connection exists', () => {
    setupUrql(null);
    renderPage();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('shows "Connect Salesforce" button when not connected', () => {
    setupUrql(null);
    renderPage();
    expect(
      screen.getByRole('button', { name: /connect salesforce/i })
    ).toBeInTheDocument();
  });

  it('shows "Connected to Salesforce" when connection is active', () => {
    setupUrql(MOCK_CONNECTION);
    renderPage();
    expect(screen.getByText('Connected to Salesforce')).toBeInTheDocument();
  });

  it('shows instance URL when connected', () => {
    setupUrql(MOCK_CONNECTION);
    renderPage();
    expect(
      screen.getByText('https://myorg.salesforce.com')
    ).toBeInTheDocument();
  });

  it('shows "Disconnect" button when connected', () => {
    setupUrql(MOCK_CONNECTION);
    renderPage();
    expect(
      screen.getByRole('button', { name: /disconnect/i })
    ).toBeInTheDocument();
  });

  it('renders webhook URL containing /crm/salesforce/webhook', () => {
    renderPage();
    expect(screen.getByText(/\/crm\/salesforce\/webhook/)).toBeInTheDocument();
  });

  it('renders Copy button for webhook URL', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('shows "No sync operations yet." when log is empty', () => {
    setupUrql(null, []);
    renderPage();
    expect(screen.getByText('No sync operations yet.')).toBeInTheDocument();
  });

  it('renders sync log entries when they exist', () => {
    setupUrql(null, MOCK_SYNC_LOG);
    renderPage();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Duplicate value')).toBeInTheDocument();
  });
});
