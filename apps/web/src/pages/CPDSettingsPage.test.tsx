import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

vi.mock('@/lib/graphql/cpd.queries', () => ({
  CPD_CREDIT_TYPES_QUERY: 'CPD_CREDIT_TYPES_QUERY',
  CREATE_CPD_CREDIT_TYPE_MUTATION: 'CREATE_CPD_CREDIT_TYPE_MUTATION',
  ASSIGN_CPD_CREDITS_MUTATION: 'ASSIGN_CPD_CREDITS_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CPDSettingsPage } from './CPDSettingsPage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CREDIT_TYPES = [
  {
    id: 'ct-1',
    name: 'NASBA CPE',
    regulatoryBody: 'NASBA',
    creditHoursPerHour: 1.0,
    isActive: true,
  },
  {
    id: 'ct-2',
    name: 'CLE Credit',
    regulatoryBody: 'ABA',
    creditHoursPerHour: 0.5,
    isActive: false,
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  creditTypes: typeof MOCK_CREDIT_TYPES | [] = [],
  fetching = false
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { cpdCreditTypes: creditTypes },
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
      <CPDSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CPDSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql([]);
  });

  it('renders "CPD Settings" heading', () => {
    renderPage();
    expect(screen.getByText('CPD Settings')).toBeInTheDocument();
  });

  it('renders "Credit Types" card title', () => {
    renderPage();
    expect(screen.getByText('Credit Types')).toBeInTheDocument();
  });

  it('renders "New Credit Type" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /new credit type/i })
    ).toBeInTheDocument();
  });

  it('renders "Assign to Course" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /assign to course/i })
    ).toBeInTheDocument();
  });

  it('shows "No credit types defined yet." when list is empty', () => {
    setupUrql([]);
    renderPage();
    expect(
      screen.getByText('No credit types defined yet.')
    ).toBeInTheDocument();
  });

  it('shows loading indicator when fetching', () => {
    setupUrql([], true);
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders credit type names in the table', () => {
    setupUrql(MOCK_CREDIT_TYPES);
    renderPage();
    expect(screen.getByText('NASBA CPE')).toBeInTheDocument();
    expect(screen.getByText('CLE Credit')).toBeInTheDocument();
  });

  it('renders regulatory body column', () => {
    setupUrql(MOCK_CREDIT_TYPES);
    renderPage();
    expect(screen.getByText('NASBA')).toBeInTheDocument();
    expect(screen.getByText('ABA')).toBeInTheDocument();
  });

  it('renders credit hours ratio formatted to 2 decimals', () => {
    setupUrql(MOCK_CREDIT_TYPES);
    renderPage();
    expect(screen.getByText('1.00')).toBeInTheDocument();
    expect(screen.getByText('0.50')).toBeInTheDocument();
  });

  it('shows "Active" and "Inactive" status badges', () => {
    setupUrql(MOCK_CREDIT_TYPES);
    renderPage();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders table headers: Name, Regulatory Body, Hours/Hour, Status', () => {
    setupUrql(MOCK_CREDIT_TYPES);
    renderPage();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Regulatory Body')).toBeInTheDocument();
    expect(screen.getByText('Hours/Hour')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
