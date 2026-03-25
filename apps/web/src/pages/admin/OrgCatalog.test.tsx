import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn() };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { OrgCatalog } from './OrgCatalog';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(items?: unknown[], fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: items ? { orgCatalog: items } : undefined, fetching, error: undefined },
  ] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OrgCatalog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders catalog page with search input', () => {
    setupMocks([]);
    render(<OrgCatalog />);
    expect(screen.getByTestId('org-catalog-page')).toBeInTheDocument();
    expect(screen.getByLabelText('catalog.searchLabel')).toBeInTheDocument();
  });

  it('shows skeleton when fetching', () => {
    setupMocks(undefined, true);
    render(<OrgCatalog />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    setupMocks([]);
    render(<OrgCatalog />);
    expect(screen.getByText('catalog.empty')).toBeInTheDocument();
  });

  it('renders catalog items in table', () => {
    setupMocks([
      { id: '1', title: 'React Basics', category: 'tech', licensedAt: '2026-01-15', expiresAt: null, enrollmentCount: 42, status: 'active' },
    ]);
    render(<OrgCatalog />);
    expect(screen.getByText('React Basics')).toBeInTheDocument();
    expect(screen.getByText('tech')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders within AdminLayout', () => {
    setupMocks([]);
    render(<OrgCatalog />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });
});
