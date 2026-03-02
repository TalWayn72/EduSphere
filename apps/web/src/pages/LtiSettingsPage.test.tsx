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

// ── Imports after mocks ───────────────────────────────────────────────────────

import { LtiSettingsPage } from './LtiSettingsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PLATFORMS = [
  {
    id: 'plat-1',
    platformName: 'Canvas LMS',
    platformUrl: 'https://canvas.example.edu',
    clientId: 'client-abc',
    authLoginUrl: 'https://canvas.example.edu/lti/authorize',
    keySetUrl: 'https://canvas.example.edu/jwks',
    deploymentId: 'deploy-123',
    isActive: true,
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  platforms: typeof MOCK_PLATFORMS | [] = [],
  fetching = false,
  error?: { message: string }
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { ltiPlatforms: platforms },
      fetching,
      error: error ?? undefined,
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
      <LtiSettingsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LtiSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql([]);
  });

  it('renders "LTI 1.3 Platforms" heading', () => {
    renderPage();
    expect(screen.getByText('LTI 1.3 Platforms')).toBeInTheDocument();
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
    expect(screen.getByText('LTI 1.3 Platforms')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('LTI 1.3 Platforms')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    setupUrql([], true);
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders "Copy Launch URL" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /copy launch url/i })
    ).toBeInTheDocument();
  });

  it('renders "Register Platform" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /register platform/i })
    ).toBeInTheDocument();
  });

  it('shows no-platforms message when list is empty', () => {
    setupUrql([]);
    renderPage();
    expect(
      screen.getByText(/no lti platforms registered yet/i)
    ).toBeInTheDocument();
  });

  it('shows registration form when "Register Platform" is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /register platform/i }));
    expect(screen.getByText('Register LTI 1.3 Platform')).toBeInTheDocument();
  });

  it('renders "Save Platform" button inside registration form', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /register platform/i }));
    expect(
      screen.getByRole('button', { name: /save platform/i })
    ).toBeInTheDocument();
  });

  it('hides form when "Register Platform" is clicked again (toggle)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /register platform/i }));
    // Now click again to close
    fireEvent.click(screen.getByRole('button', { name: /register platform/i }));
    expect(
      screen.queryByText('Register LTI 1.3 Platform')
    ).not.toBeInTheDocument();
  });

  it('renders platform card when platforms exist', () => {
    setupUrql(MOCK_PLATFORMS);
    renderPage();
    expect(screen.getByText('Canvas LMS')).toBeInTheDocument();
  });

  it('renders platform URL in card', () => {
    setupUrql(MOCK_PLATFORMS);
    renderPage();
    expect(screen.getByText('https://canvas.example.edu')).toBeInTheDocument();
  });

  it('shows Active status for active platforms', () => {
    setupUrql(MOCK_PLATFORMS);
    renderPage();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Test Connection" button for each platform', () => {
    setupUrql(MOCK_PLATFORMS);
    renderPage();
    expect(
      screen.getByRole('button', { name: /test connection/i })
    ).toBeInTheDocument();
  });
});
