import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScimTokenList } from './ScimTokenList';
import type { ScimToken } from './scim-settings.types';

// ── shadcn mocks ──────────────────────────────────────────────────────────────
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
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));

// ── fixtures ──────────────────────────────────────────────────────────────────
const activeToken: ScimToken = {
  id: 'tok-1',
  description: 'Workday Production',
  lastUsedAt: '2026-03-15T10:00:00Z',
  expiresAt: '2027-03-15T10:00:00Z',
  isActive: true,
  createdAt: '2026-01-10T00:00:00Z',
};

const revokedToken: ScimToken = {
  id: 'tok-2',
  description: 'BambooHR Staging',
  lastUsedAt: null,
  expiresAt: null,
  isActive: false,
  createdAt: '2026-02-20T00:00:00Z',
};

const defaultProps = {
  tokens: [] as ScimToken[],
  fetching: false,
  onGenerateClick: vi.fn(),
  onRevoke: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderList(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ScimTokenList {...{ ...defaultProps, ...overrides }} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('ScimTokenList — header', () => {
  it('renders the card title', () => {
    renderList();
    expect(screen.getByText('API Tokens')).toBeTruthy();
  });

  it('renders the description text', () => {
    renderList();
    expect(
      screen.getByText('Bearer tokens for HRIS SCIM authentication')
    ).toBeTruthy();
  });

  it('renders Generate Token button', () => {
    renderList();
    expect(screen.getByText('Generate Token')).toBeTruthy();
  });

  it('calls onGenerateClick when button clicked', () => {
    const onGenerateClick = vi.fn();
    renderList({ onGenerateClick });
    fireEvent.click(screen.getByText('Generate Token'));
    expect(onGenerateClick).toHaveBeenCalledTimes(1);
  });
});

describe('ScimTokenList — loading state', () => {
  it('shows loading indicator when fetching', () => {
    renderList({ fetching: true });
    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByTestId('icon-loader')).toBeTruthy();
  });

  it('does not show token list when fetching', () => {
    renderList({ fetching: true, tokens: [activeToken] });
    expect(screen.queryByText('Workday Production')).toBeNull();
  });
});

describe('ScimTokenList — empty state', () => {
  it('shows empty message when no tokens', () => {
    renderList({ tokens: [] });
    expect(
      screen.getByText('No tokens yet. Generate one to get started.')
    ).toBeTruthy();
  });
});

describe('ScimTokenList — token rendering', () => {
  it('renders token description', () => {
    renderList({ tokens: [activeToken] });
    expect(screen.getByText('Workday Production')).toBeTruthy();
  });

  it('renders created date', () => {
    renderList({ tokens: [activeToken] });
    const formatted = new Date('2026-01-10T00:00:00Z').toLocaleDateString();
    expect(screen.getByText(new RegExp(formatted))).toBeTruthy();
  });

  it('shows Active badge for active tokens', () => {
    renderList({ tokens: [activeToken] });
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('shows Revoked badge for revoked tokens', () => {
    renderList({ tokens: [revokedToken] });
    expect(screen.getByText('Revoked')).toBeTruthy();
  });

  it('shows revoke button only for active tokens', () => {
    renderList({ tokens: [activeToken, revokedToken] });
    const revokeButtons = screen.getAllByLabelText(/Revoke token/);
    expect(revokeButtons).toHaveLength(1);
    expect(revokeButtons[0].getAttribute('aria-label')).toBe(
      'Revoke token: Workday Production'
    );
  });

  it('does not show revoke button for revoked tokens', () => {
    renderList({ tokens: [revokedToken] });
    expect(screen.queryByLabelText(/Revoke token/)).toBeNull();
  });

  it('calls onRevoke with token id when revoke clicked', () => {
    const onRevoke = vi.fn();
    renderList({ tokens: [activeToken], onRevoke });
    fireEvent.click(screen.getByLabelText('Revoke token: Workday Production'));
    expect(onRevoke).toHaveBeenCalledWith('tok-1');
  });

  it('renders multiple tokens', () => {
    renderList({ tokens: [activeToken, revokedToken] });
    expect(screen.getByText('Workday Production')).toBeTruthy();
    expect(screen.getByText('BambooHR Staging')).toBeTruthy();
  });

  it('shows last used date when present', () => {
    renderList({ tokens: [activeToken] });
    const lastUsed = new Date('2026-03-15T10:00:00Z').toLocaleDateString();
    expect(screen.getByText(new RegExp(`Last used.*${lastUsed}`))).toBeTruthy();
  });

  it('shows expiry date when present', () => {
    renderList({ tokens: [activeToken] });
    const expires = new Date('2027-03-15T10:00:00Z').toLocaleDateString();
    expect(screen.getByText(new RegExp(`Expires.*${expires}`))).toBeTruthy();
  });
});
