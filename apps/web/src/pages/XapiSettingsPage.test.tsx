import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (String(values[i] ?? '')), ''),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/xapi.queries', () => ({
  XAPI_TOKENS_QUERY: 'XAPI_TOKENS_QUERY',
  XAPI_STATEMENTS_QUERY: 'XAPI_STATEMENTS_QUERY',
  GENERATE_XAPI_TOKEN_MUTATION: 'GENERATE_XAPI_TOKEN_MUTATION',
  REVOKE_XAPI_TOKEN_MUTATION: 'REVOKE_XAPI_TOKEN_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { XapiSettingsPage } from './XapiSettingsPage';
import * as urql from 'urql';
import * as useAuthRoleModule from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TOKENS = [
  {
    id: 'tok1',
    description: 'Rustici SCORM Cloud',
    lrsEndpoint: null,
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'tok2',
    description: 'Old Token',
    lrsEndpoint: 'https://lrs.example.com',
    isActive: false,
    createdAt: '2023-12-01T00:00:00Z',
  },
];

const MOCK_STATEMENTS = [
  {
    id: 'stmt1',
    verb: 'http://adlnet.gov/expapi/verbs/completed',
    objectId: 'https://example.com/courses/intro',
    storedAt: '2024-03-01T10:00:00Z',
  },
];

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });

function setupMocks(opts: {
  tokens?: typeof MOCK_TOKENS;
  statements?: typeof MOCK_STATEMENTS;
  tokensFetching?: boolean;
  role?: string | null;
} = {}) {
  const {
    tokens,
    statements,
    tokensFetching = false,
    role = 'ORG_ADMIN',
  } = opts;

  vi.mocked(useAuthRoleModule.useAuthRole).mockReturnValue(role);

  let callCount = 0;
  vi.mocked(urql.useQuery).mockImplementation(() => {
    const call = callCount++;
    if (call === 0) {
      // tokensResult
      return [
        {
          fetching: tokensFetching,
          data: tokens ? { xapiTokens: tokens } : undefined,
          error: undefined,
        },
        vi.fn(),
        vi.fn(),
      ] as never;
    }
    // statementsResult
    return [
      {
        fetching: false,
        data: statements ? { xapiStatements: statements } : undefined,
        error: undefined,
      },
      vi.fn(),
      vi.fn(),
    ] as never;
  });

  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    NOOP_EXECUTE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <XapiSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('XapiSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the xAPI heading', () => {
    renderPage();
    expect(screen.getByText('xAPI / LRS Integration')).toBeInTheDocument();
  });

  it('renders the LRS Endpoint card', () => {
    renderPage();
    expect(screen.getByText('LRS Endpoint')).toBeInTheDocument();
    expect(
      screen.getByText(/submit xapi statements to this url/i)
    ).toBeInTheDocument();
  });

  it('renders the Copy button for LRS endpoint', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('renders the API Tokens section', () => {
    renderPage();
    expect(screen.getByText('API Tokens')).toBeInTheDocument();
  });

  it('shows "No tokens yet." when token list is empty', () => {
    setupMocks({ tokens: [] });
    renderPage();
    expect(screen.getByText('No tokens yet.')).toBeInTheDocument();
  });

  it('renders token rows with descriptions', () => {
    setupMocks({ tokens: MOCK_TOKENS });
    renderPage();
    expect(screen.getByText('Rustici SCORM Cloud')).toBeInTheDocument();
    expect(screen.getByText('Old Token')).toBeInTheDocument();
  });

  it('shows Active / Revoked status badges on tokens', () => {
    setupMocks({ tokens: MOCK_TOKENS });
    renderPage();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('opens the Generate Token modal when clicking Generate button', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(screen.getByText('Generate xAPI Token')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/rustici scorm cloud/i)).toBeInTheDocument();
  });

  it('modal Cancel button closes the modal', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(screen.getByText('Generate xAPI Token')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('Generate xAPI Token')).not.toBeInTheDocument();
  });

  it('Generate button inside modal is disabled when description is empty', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    // The Generate button inside the modal (second one)
    const modalGenerateBtn = screen.getAllByRole('button', { name: /generate/i })[1];
    expect(modalGenerateBtn).toBeDisabled();
  });

  it('shows no statements message when list is empty', () => {
    setupMocks({ statements: [] });
    renderPage();
    expect(screen.getByText('No statements yet.')).toBeInTheDocument();
  });

  it('renders recent statements', () => {
    setupMocks({ statements: MOCK_STATEMENTS });
    renderPage();
    // verb.split('/').pop() = 'completed'
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/courses/intro')).toBeInTheDocument();
  });

  it('redirects (renders null) when user role is not admin', () => {
    setupMocks({ role: 'STUDENT' });
    const { container } = renderPage();
    // Page renders null and calls navigate('/dashboard')
    expect(container.querySelector('h1')).not.toBeInTheDocument();
  });
});
