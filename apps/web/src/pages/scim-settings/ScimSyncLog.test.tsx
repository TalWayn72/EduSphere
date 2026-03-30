import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScimSyncLog } from './ScimSyncLog';
import type { ScimSyncEntry } from './scim-settings.types';

// ── shadcn mocks ──────────────────────────────────────────────────────────────
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
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
  AlertCircle: () => <span data-testid="icon-alert" />,
}));

// ── fixtures ──────────────────────────────────────────────────────────────────
const successEntry: ScimSyncEntry = {
  id: 'log-1',
  operation: 'CREATE_USER',
  externalId: 'ext-abc-123',
  status: 'SUCCESS',
  errorMessage: null,
  createdAt: '2026-03-20T14:30:00Z',
};

const failedEntry: ScimSyncEntry = {
  id: 'log-2',
  operation: 'UPDATE_USER',
  externalId: null,
  status: 'FAILURE',
  errorMessage: 'User not found in directory',
  createdAt: '2026-03-21T09:15:00Z',
};

const minimalEntry: ScimSyncEntry = {
  id: 'log-3',
  operation: 'DELETE_USER',
  externalId: null,
  status: 'SUCCESS',
  errorMessage: null,
  createdAt: '2026-03-22T11:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('ScimSyncLog — header', () => {
  it('renders the card title', () => {
    render(<ScimSyncLog entries={[]} />);
    expect(screen.getByText('Sync Log')).toBeTruthy();
  });

  it('renders the description text', () => {
    render(<ScimSyncLog entries={[]} />);
    expect(screen.getByText('Recent SCIM provisioning operations')).toBeTruthy();
  });
});

describe('ScimSyncLog — empty state', () => {
  it('shows empty message when no entries', () => {
    render(<ScimSyncLog entries={[]} />);
    expect(screen.getByText('No sync operations yet.')).toBeTruthy();
  });
});

describe('ScimSyncLog — entry rendering', () => {
  it('renders operation name', () => {
    render(<ScimSyncLog entries={[successEntry]} />);
    expect(screen.getByText('CREATE_USER')).toBeTruthy();
  });

  it('renders SUCCESS status', () => {
    render(<ScimSyncLog entries={[successEntry]} />);
    expect(screen.getByText('SUCCESS')).toBeTruthy();
  });

  it('renders FAILURE status', () => {
    render(<ScimSyncLog entries={[failedEntry]} />);
    expect(screen.getByText('FAILURE')).toBeTruthy();
  });

  it('renders externalId when present', () => {
    render(<ScimSyncLog entries={[successEntry]} />);
    expect(screen.getByText('ext-abc-123')).toBeTruthy();
  });

  it('does not render externalId when null', () => {
    render(<ScimSyncLog entries={[minimalEntry]} />);
    expect(screen.queryByText('ext-abc-123')).toBeNull();
  });

  it('renders error message when present', () => {
    render(<ScimSyncLog entries={[failedEntry]} />);
    expect(screen.getByText('User not found in directory')).toBeTruthy();
  });

  it('shows alert icon for error entries', () => {
    render(<ScimSyncLog entries={[failedEntry]} />);
    expect(screen.getByTestId('icon-alert')).toBeTruthy();
  });

  it('does not show alert icon for success entries', () => {
    render(<ScimSyncLog entries={[successEntry]} />);
    expect(screen.queryByTestId('icon-alert')).toBeNull();
  });

  it('renders timestamp for each entry', () => {
    render(<ScimSyncLog entries={[successEntry]} />);
    const formatted = new Date('2026-03-20T14:30:00Z').toLocaleString();
    expect(screen.getByText(formatted)).toBeTruthy();
  });

  it('renders multiple entries', () => {
    render(<ScimSyncLog entries={[successEntry, failedEntry, minimalEntry]} />);
    expect(screen.getByText('CREATE_USER')).toBeTruthy();
    expect(screen.getByText('UPDATE_USER')).toBeTruthy();
    expect(screen.getByText('DELETE_USER')).toBeTruthy();
  });

  it('does not show empty message when entries exist', () => {
    render(<ScimSyncLog entries={[successEntry]} />);
    expect(screen.queryByText('No sync operations yet.')).toBeNull();
  });
});
