/**
 * BrandedLoginPage.test.tsx — Tests for the org-branded login page component.
 * Covers: loading state, org not found, branding display, SSO providers,
 * Keycloak redirect, default fallback.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrandedLoginPage } from './BrandedLoginPage';

// Mock useBrandedLogin hook
const mockUseBrandedLogin = vi.fn();
vi.mock('@/hooks/useBrandedLogin', () => ({
  useBrandedLogin: (...args: unknown[]) => mockUseBrandedLogin(...args),
}));

const DEFAULT_LOGIN_CONFIG = {
  orgName: 'AcmeCorp',
  logoUrl: '/acme-logo.png',
  primaryColor: '#ff0000',
  secondaryColor: '#00ff00',
  welcomeMessage: 'Welcome to AcmeCorp Learning!',
  ssoProviders: [] as {
    id: string;
    name: string;
    type: string;
    iconUrl: string | null;
  }[],
  isLoading: false,
  isOrgFound: true,
  keycloakAuthUrl:
    'http://localhost:8080/realms/edusphere/protocol/openid-connect/auth?client_id=edusphere-web',
  buildSsoUrl: (idp: string) => `http://localhost:8080/auth?kc_idp_hint=${idp}`,
};

describe('BrandedLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBrandedLogin.mockReturnValue(DEFAULT_LOGIN_CONFIG);
  });

  it('shows loading spinner while fetching', () => {
    mockUseBrandedLogin.mockReturnValue({
      ...DEFAULT_LOGIN_CONFIG,
      isLoading: true,
      isOrgFound: false,
    });
    const { container } = render(<BrandedLoginPage slug="acme" />);
    expect(screen.getByTestId('branded-login-loading')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows org not found when org is not found', () => {
    mockUseBrandedLogin.mockReturnValue({
      ...DEFAULT_LOGIN_CONFIG,
      isLoading: false,
      isOrgFound: false,
    });
    render(<BrandedLoginPage slug="unknown" />);
    expect(screen.getByTestId('branded-login-not-found')).toBeInTheDocument();
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
  });

  it('renders org name and welcome message', () => {
    render(<BrandedLoginPage slug="acme" />);
    expect(screen.getByText('AcmeCorp')).toBeInTheDocument();
    expect(
      screen.getByText('Welcome to AcmeCorp Learning!')
    ).toBeInTheDocument();
  });

  it('renders org logo when logoUrl is provided', () => {
    render(<BrandedLoginPage slug="acme" />);
    const logo = screen.getByTestId('branded-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/acme-logo.png');
    expect(logo).toHaveAttribute('alt', 'AcmeCorp');
  });

  it('renders default icon when no logoUrl', () => {
    mockUseBrandedLogin.mockReturnValue({
      ...DEFAULT_LOGIN_CONFIG,
      logoUrl: null,
    });
    render(<BrandedLoginPage slug="acme" />);
    expect(screen.queryByTestId('branded-logo')).not.toBeInTheDocument();
    expect(screen.getByTestId('branded-default-icon')).toBeInTheDocument();
  });

  it('renders Sign In button with branded color', () => {
    render(<BrandedLoginPage slug="acme" />);
    const btn = screen.getByTestId('branded-login-btn');
    expect(btn).toBeInTheDocument();
    expect(btn.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('does not render welcome message when null', () => {
    mockUseBrandedLogin.mockReturnValue({
      ...DEFAULT_LOGIN_CONFIG,
      welcomeMessage: null,
    });
    render(<BrandedLoginPage slug="acme" />);
    expect(
      screen.queryByTestId('branded-welcome-message')
    ).not.toBeInTheDocument();
  });

  it('renders SSO buttons when ssoProviders are present', () => {
    mockUseBrandedLogin.mockReturnValue({
      ...DEFAULT_LOGIN_CONFIG,
      ssoProviders: [
        { id: 'google', name: 'Google', type: 'oidc', iconUrl: '/google.svg' },
        { id: 'azure-ad', name: 'Azure AD', type: 'saml', iconUrl: null },
      ],
    });
    render(<BrandedLoginPage slug="acme" />);
    expect(screen.getByTestId('sso-btn-google')).toBeInTheDocument();
    expect(screen.getByTestId('sso-btn-azure-ad')).toBeInTheDocument();
    expect(screen.getByTestId('sso-providers')).toBeInTheDocument();
  });

  it('does not render SSO section when no providers', () => {
    render(<BrandedLoginPage slug="acme" />);
    expect(screen.queryByTestId('sso-providers')).not.toBeInTheDocument();
  });

  it('redirects to Keycloak on Sign In click', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '', origin: 'http://localhost:5173' },
    });
    render(<BrandedLoginPage slug="acme" />);
    fireEvent.click(screen.getByTestId('branded-login-btn'));
    expect(window.location.href).toContain(
      '/realms/edusphere/protocol/openid-connect/auth'
    );
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('passes slug to useBrandedLogin', () => {
    render(<BrandedLoginPage slug="my-org" />);
    expect(mockUseBrandedLogin).toHaveBeenCalledWith('my-org');
  });

  it('applies branded primary color as CSS variable', () => {
    render(<BrandedLoginPage slug="acme" />);
    const page = screen.getByTestId('branded-login-page');
    expect(page.style.getPropertyValue('--branded-primary')).toBe('#ff0000');
  });
});
