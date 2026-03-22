import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrandedLoginPage } from './BrandedLoginPage';

// Mock urql
const mockUseQuery = vi.fn();
vi.mock('urql', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, string>) => {
      if (typeof fallback === 'string') return fallback;
      if (typeof fallback === 'object' && 'provider' in fallback) {
        return `Sign in with ${fallback.provider}`;
      }
      return key;
    },
  }),
}));

const MOCK_BRANDING = {
  orgName: 'AcmeCorp',
  logoUrl: '/acme-logo.png',
  primaryColor: '#ff0000',
  secondaryColor: '#00ff00',
  welcomeMessage: 'Welcome to AcmeCorp Learning!',
  ssoProviders: [],
};

const MOCK_BRANDING_WITH_SSO = {
  ...MOCK_BRANDING,
  ssoProviders: [
    { id: 'google', name: 'Google', type: 'oidc', iconUrl: '/google.svg' },
    { id: 'azure-ad', name: 'Azure AD', type: 'saml', iconUrl: null },
  ],
};

function renderBrandedLogin(slug = 'acme') {
  return render(
    <MemoryRouter initialEntries={[`/org/${slug}/login`]}>
      <Routes>
        <Route path="/org/:slug/login" element={<BrandedLoginPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BrandedLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while fetching', () => {
    mockUseQuery.mockReturnValue([{ data: null, fetching: true }]);
    const { container } = renderBrandedLogin();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows org not found when branding is null', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: null }, fetching: false },
    ]);
    renderBrandedLogin();
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
  });

  it('renders org name and welcome message', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    renderBrandedLogin();
    expect(screen.getByText('AcmeCorp')).toBeInTheDocument();
    expect(
      screen.getByText('Welcome to AcmeCorp Learning!')
    ).toBeInTheDocument();
  });

  it('renders org logo when logoUrl is provided', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    renderBrandedLogin();
    const logo = screen.getByTestId('branded-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/acme-logo.png');
  });

  it('renders fallback icon when no logoUrl', () => {
    mockUseQuery.mockReturnValue([
      {
        data: {
          brandedLoginData: { ...MOCK_BRANDING, logoUrl: null },
        },
        fetching: false,
      },
    ]);
    renderBrandedLogin();
    expect(screen.queryByTestId('branded-logo')).not.toBeInTheDocument();
  });

  it('renders Sign In button with branded color', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    renderBrandedLogin();
    const btn = screen.getByTestId('branded-login-btn');
    expect(btn).toBeInTheDocument();
    expect(btn.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('renders SSO buttons when ssoProviders are present', () => {
    mockUseQuery.mockReturnValue([
      {
        data: { brandedLoginData: MOCK_BRANDING_WITH_SSO },
        fetching: false,
      },
    ]);
    renderBrandedLogin();
    expect(screen.getByTestId('sso-btn-google')).toBeInTheDocument();
    expect(screen.getByTestId('sso-btn-azure-ad')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Azure AD')).toBeInTheDocument();
  });

  it('does not render SSO section when no providers', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    renderBrandedLogin();
    expect(screen.queryByText('or continue with')).not.toBeInTheDocument();
  });

  it('redirects to Keycloak on Sign In click', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'http://localhost:5173' },
    });
    renderBrandedLogin();
    fireEvent.click(screen.getByTestId('branded-login-btn'));
    expect(window.location.href).toContain('/realms/edusphere/protocol/openid-connect/auth');
    expect(window.location.href).toContain('client_id=edusphere');
    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });
});
