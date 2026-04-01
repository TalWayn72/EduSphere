import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScimSettingsPage } from './ScimSettingsPage';

// ── mocks ─────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockRefetch = vi.fn();
const mockGenerateToken = vi.fn().mockResolvedValue({ data: null });
const mockRevokeToken = vi.fn().mockResolvedValue({ data: null });

vi.mock('urql', () => ({
  useQuery: vi.fn().mockImplementation(({ query }: { query: string }) => {
    if (
      query.includes &&
      typeof query === 'string' &&
      query.includes('scimSyncLog')
    ) {
      return [{ data: { scimSyncLog: [] }, fetching: false }, vi.fn()];
    }
    return [{ data: { scimTokens: [] }, fetching: false }, mockRefetch];
  }),
  useMutation: vi.fn().mockImplementation((query: string) => {
    if (typeof query === 'string' && query.includes('revoke')) {
      return [{}, mockRevokeToken];
    }
    return [{}, mockGenerateToken];
  }),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn().mockReturnValue('ORG_ADMIN'),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/Breadcrumbs', () => ({
  Breadcrumbs: () => <nav data-testid="breadcrumbs" />,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="icon-shield" />,
  Copy: () => <span data-testid="icon-copy" />,
}));

vi.mock('@/lib/constants', () => ({
  TOAST_AUTO_DISMISS_MS: 2000,
}));

vi.mock('@/lib/graphql/scim.queries', () => ({
  SCIM_TOKENS_QUERY: 'scimTokens',
  SCIM_SYNC_LOG_QUERY: 'scimSyncLog',
  GENERATE_SCIM_TOKEN_MUTATION: 'generateScimToken',
  REVOKE_SCIM_TOKEN_MUTATION: 'revokeScimToken',
}));

vi.mock('./ScimTokenList', () => ({
  ScimTokenList: ({
    onGenerateClick,
    onRevoke,
  }: {
    tokens: unknown[];
    fetching: boolean;
    onGenerateClick: () => void;
    onRevoke: (id: string) => void;
  }) => (
    <div data-testid="token-list">
      <button onClick={onGenerateClick}>mock-generate</button>
      <button onClick={() => onRevoke('tok-1')}>mock-revoke</button>
    </div>
  ),
}));

vi.mock('./ScimSyncLog', () => ({
  ScimSyncLog: () => <div data-testid="sync-log" />,
}));

vi.mock('./GenerateTokenDialog', () => ({
  GenerateTokenDialog: ({
    open,
    onGenerate,
    onDone,
  }: {
    open: boolean;
    onGenerate: () => void;
    onDone: () => void;
  }) =>
    open ? (
      <div data-testid="token-dialog">
        <button onClick={() => void onGenerate()}>dialog-generate</button>
        <button onClick={onDone}>dialog-done</button>
      </div>
    ) : null,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('ScimSettingsPage — access control', () => {
  it('redirects non-admin users to dashboard', async () => {
    const { useAuthRole } = await import('@/hooks/useAuthRole');
    (useAuthRole as ReturnType<typeof vi.fn>).mockReturnValue('STUDENT');
    render(<ScimSettingsPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('renders for ORG_ADMIN role', async () => {
    const { useAuthRole } = await import('@/hooks/useAuthRole');
    (useAuthRole as ReturnType<typeof vi.fn>).mockReturnValue('ORG_ADMIN');
    render(<ScimSettingsPage />);
    expect(screen.getByText('SCIM / HRIS Integration')).toBeTruthy();
  });

  it('renders for SUPER_ADMIN role', async () => {
    const { useAuthRole } = await import('@/hooks/useAuthRole');
    (useAuthRole as ReturnType<typeof vi.fn>).mockReturnValue('SUPER_ADMIN');
    render(<ScimSettingsPage />);
    expect(screen.getByText('SCIM / HRIS Integration')).toBeTruthy();
  });
});

describe('ScimSettingsPage — layout', () => {
  it('renders page title', () => {
    render(<ScimSettingsPage />);
    expect(screen.getByText('SCIM / HRIS Integration')).toBeTruthy();
  });

  it('renders SCIM endpoint card', () => {
    render(<ScimSettingsPage />);
    expect(screen.getByText('SCIM Endpoint')).toBeTruthy();
  });

  it('renders the endpoint URL', () => {
    render(<ScimSettingsPage />);
    expect(screen.getByText(/\/scim\/v2/)).toBeTruthy();
  });

  it('renders ScimTokenList component', () => {
    render(<ScimSettingsPage />);
    expect(screen.getByTestId('token-list')).toBeTruthy();
  });

  it('renders ScimSyncLog component', () => {
    render(<ScimSettingsPage />);
    expect(screen.getByTestId('sync-log')).toBeTruthy();
  });

  it('renders breadcrumbs', () => {
    render(<ScimSettingsPage />);
    expect(screen.getByTestId('breadcrumbs')).toBeTruthy();
  });
});

describe('ScimSettingsPage — token dialog', () => {
  it('does not show token dialog initially', () => {
    render(<ScimSettingsPage />);
    expect(screen.queryByTestId('token-dialog')).toBeNull();
  });

  it('opens token dialog when generate clicked', () => {
    render(<ScimSettingsPage />);
    fireEvent.click(screen.getByText('mock-generate'));
    expect(screen.getByTestId('token-dialog')).toBeTruthy();
  });

  it('closes dialog when done is clicked', () => {
    render(<ScimSettingsPage />);
    fireEvent.click(screen.getByText('mock-generate'));
    expect(screen.getByTestId('token-dialog')).toBeTruthy();
    fireEvent.click(screen.getByText('dialog-done'));
    expect(screen.queryByTestId('token-dialog')).toBeNull();
  });
});

describe('ScimSettingsPage — copy endpoint', () => {
  it('renders copy button', () => {
    render(<ScimSettingsPage />);
    expect(screen.getByText('Copy')).toBeTruthy();
  });
});
