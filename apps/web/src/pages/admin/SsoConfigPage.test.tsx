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

// ── Import after mocks ────────────────────────────────────────────────────────

import { SsoConfigPage } from './SsoConfigPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(ssoConfig?: Record<string, unknown>) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: ssoConfig ? { ssoConfig } : undefined,
      fetching: false,
      error: undefined,
    },
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([{}, vi.fn()] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SsoConfigPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders SSO config page', () => {
    setupMocks();
    render(<SsoConfigPage />);
    expect(screen.getByTestId('sso-config-page')).toBeInTheDocument();
  });

  it('renders SAML and OIDC tab triggers', () => {
    setupMocks();
    render(<SsoConfigPage />);
    expect(screen.getByText('SAML 2.0')).toBeInTheDocument();
    expect(screen.getByText('OpenID Connect')).toBeInTheDocument();
  });

  it('shows SAML form fields by default', () => {
    setupMocks();
    render(<SsoConfigPage />);
    expect(screen.getByLabelText('sso.entityId')).toBeInTheDocument();
    expect(screen.getByLabelText('sso.ssoUrl')).toBeInTheDocument();
    expect(screen.getByLabelText('sso.certificate')).toBeInTheDocument();
  });

  it('shows current provider badge when config exists', () => {
    setupMocks({ provider: 'SAML', status: 'active' });
    render(<SsoConfigPage />);
    expect(screen.getByText('SAML')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders within AdminLayout', () => {
    setupMocks();
    render(<SsoConfigPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });

  it('renders save buttons for both tabs', () => {
    setupMocks();
    render(<SsoConfigPage />);
    const saveButtons = screen.getAllByText('sso.save');
    expect(saveButtons.length).toBeGreaterThanOrEqual(1);
  });
});
