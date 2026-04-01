/**
 * Tests for App.tsx — Root application component
 *
 * Covers: default export, renders loading state initially,
 * renders full app after keycloak init.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  RouterProvider: ({ router: _r }: { router: unknown }) =>
    React.createElement('div', { 'data-testid': 'router-provider' }, 'Router'),
  createBrowserRouter: vi.fn(() => ({ navigate: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      'div',
      { 'data-testid': 'query-client-provider' },
      children
    ),
  QueryClient: vi.fn(() => ({})),
}));

vi.mock('urql', () => ({
  Provider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'urql-provider' }, children),
}));

vi.mock('@/lib/urql-client', () => ({ urqlClient: {} }));

vi.mock('@/lib/persisted-query-client', () => ({
  queryClient: {},
  persister: {},
}));

const mockInitKeycloak = vi.fn(() => Promise.resolve());
const mockIsAuthenticated = vi.fn(() => false);
vi.mock('@/lib/auth', () => ({
  initKeycloak: () => mockInitKeycloak(),
  isAuthenticated: () => mockIsAuthenticated(),
}));

vi.mock('@/lib/i18n', () => ({
  initI18n: vi.fn(() => Promise.resolve()),
  applyDocumentDirection: vi.fn(),
}));

vi.mock('@/lib/router', () => ({
  router: { navigate: vi.fn() },
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
}));

vi.mock('@/components/StorageWarningBanner', () => ({
  StorageWarningBanner: () => null,
}));

vi.mock('@/components/GlobalLocaleSync', () => ({
  GlobalLocaleSync: () => null,
}));

vi.mock('@/components/SessionExpiryDialog', () => ({
  SessionExpiryDialog: () => null,
}));

vi.mock('@/hooks/useTokenExpiryWatcher', () => ({
  useTokenExpiryWatcher: () => ({ expired: false, handleReLogin: vi.fn() }),
}));

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/contexts/DirectionContext', () => ({
  DirectionProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/contexts/BrandingContext', () => ({
  BrandingProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/a11y/SkipLinks', () => ({
  SkipLinks: () => null,
}));

vi.mock('@/pwa', () => ({
  registerServiceWorker: vi.fn(),
}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/seo', () => ({
  WebSiteSchema: () => null,
  OrganizationSchema: () => null,
}));

import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitKeycloak.mockResolvedValue(undefined);
    mockIsAuthenticated.mockReturnValue(false);
  });

  it('is exported as a default export', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('shows loading state initially', () => {
    // Make init hang so we stay in loading state
    mockInitKeycloak.mockReturnValue(new Promise(() => {}));
    const { container } = render(<App />);
    expect(container.textContent).toContain('Initializing authentication');
  });

  it('renders the full app after keycloak initializes', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('router-provider')).toBeTruthy();
    });
  });

  it('handles keycloak init failure gracefully', async () => {
    mockInitKeycloak.mockRejectedValue(new Error('KC failed'));
    render(<App />);
    // Should still eventually render the router (non-fatal failure)
    await waitFor(() => {
      expect(screen.getByTestId('router-provider')).toBeTruthy();
    });
  });
});
