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

vi.mock('./WebhooksPage.form', () => ({
  WebhookForm: ({ t }: { t: (k: string) => string }) => (
    <div data-testid="webhook-form">{t('webhooks.createTitle')}</div>
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { WebhooksPage } from './WebhooksPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(webhooks?: unknown[], fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: webhooks ? { webhooks } : undefined, fetching, error: undefined },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([{}, vi.fn()] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WebhooksPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders webhooks page within AdminLayout', () => {
    setupMocks([]);
    render(<WebhooksPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByTestId('webhooks-page')).toBeInTheDocument();
  });

  it('renders WebhookForm component', () => {
    setupMocks([]);
    render(<WebhooksPage />);
    expect(screen.getByTestId('webhook-form')).toBeInTheDocument();
  });

  it('shows loading message when fetching', () => {
    setupMocks(undefined, true);
    render(<WebhooksPage />);
    expect(screen.getByText('webhooks.loading')).toBeInTheDocument();
  });

  it('shows no webhooks message when list is empty', () => {
    setupMocks([]);
    render(<WebhooksPage />);
    expect(screen.getByText('webhooks.noWebhooks')).toBeInTheDocument();
  });

  it('renders webhook rows when data is present', () => {
    setupMocks([
      { id: 'wh1', url: 'https://api.test/hook', events: ['user.created'], active: true, secret: 'x', createdAt: '2026-01-01' },
    ]);
    render(<WebhooksPage />);
    expect(screen.getByText('https://api.test/hook')).toBeInTheDocument();
    expect(screen.getByText('user.created')).toBeInTheDocument();
  });

  it('has sr-only heading for accessibility', () => {
    setupMocks([]);
    render(<WebhooksPage />);
    expect(screen.getByText('Webhooks')).toHaveClass('sr-only');
  });
});
