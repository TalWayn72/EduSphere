import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { MarketplaceSuccess } from './MarketplaceSuccess';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplaceSuccess', () => {
  it('renders success page', () => {
    render(
      <MemoryRouter initialEntries={['/admin/marketplace/success']}>
        <MarketplaceSuccess />
      </MemoryRouter>
    );
    expect(screen.getByTestId('marketplace-success-page')).toBeInTheDocument();
  });

  it('shows purchase complete heading', () => {
    render(
      <MemoryRouter initialEntries={['/admin/marketplace/success']}>
        <MarketplaceSuccess />
      </MemoryRouter>
    );
    expect(screen.getByText('Purchase Complete!')).toBeInTheDocument();
  });

  it('shows success description message', () => {
    render(
      <MemoryRouter initialEntries={['/admin/marketplace/success']}>
        <MarketplaceSuccess />
      </MemoryRouter>
    );
    expect(screen.getByText(/course has been licensed/i)).toBeInTheDocument();
  });

  it('shows session ID when present in URL', () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/admin/marketplace/success?session_id=cs_test_abcdefghijklmnopqrst',
        ]}
      >
        <MarketplaceSuccess />
      </MemoryRouter>
    );
    expect(screen.getByText(/cs_test_abcdefghijkl/)).toBeInTheDocument();
  });

  it('does not show session ID when not in URL', () => {
    render(
      <MemoryRouter initialEntries={['/admin/marketplace/success']}>
        <MarketplaceSuccess />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Session/)).not.toBeInTheDocument();
  });

  it('has navigation links to purchases and browse', () => {
    render(
      <MemoryRouter initialEntries={['/admin/marketplace/success']}>
        <MarketplaceSuccess />
      </MemoryRouter>
    );
    expect(screen.getByText('View Purchases')).toBeInTheDocument();
    expect(screen.getByText('Continue Browsing')).toBeInTheDocument();
  });
});
