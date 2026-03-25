import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('./ApiKeysPage.table', () => ({
  ApiKeysTable: ({ keys, fetching }: { keys: unknown[]; fetching: boolean }) => (
    <div data-testid="api-keys-table" data-fetching={fetching} data-count={keys.length} />
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { ApiKeysPage } from './ApiKeysPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockExecuteMutation = vi.fn().mockResolvedValue({ data: null });

function setupMocks(queryData?: { apiKeys: unknown[] }, fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: queryData, fetching, error: undefined },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([{}, mockExecuteMutation] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ApiKeysPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the API Keys page within AdminLayout', () => {
    setupMocks();
    render(<ApiKeysPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByTestId('api-keys-page')).toBeInTheDocument();
  });

  it('renders create key form with description input', () => {
    setupMocks();
    render(<ApiKeysPage />);
    expect(screen.getByLabelText('apiKeys.descriptionLabel')).toBeInTheDocument();
  });

  it('renders generate button', () => {
    setupMocks();
    render(<ApiKeysPage />);
    expect(screen.getByText('apiKeys.generate')).toBeInTheDocument();
  });

  it('renders the ApiKeysTable component', () => {
    setupMocks({ apiKeys: [] });
    render(<ApiKeysPage />);
    expect(screen.getByTestId('api-keys-table')).toBeInTheDocument();
  });

  it('has sr-only heading for accessibility', () => {
    setupMocks();
    render(<ApiKeysPage />);
    expect(screen.getByText('API Keys')).toHaveClass('sr-only');
  });
});
