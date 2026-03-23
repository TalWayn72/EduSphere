/**
 * useBrandedLogin.test.ts — Tests for branded login hook.
 * Covers: data loading, default fallback, Keycloak URL building, SSO URLs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBrandedLogin, buildKeycloakUrl } from './useBrandedLogin';

// Mock urql
const mockUseQuery = vi.fn();
vi.mock('urql', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

// Mock import.meta.env
vi.stubEnv('VITE_KEYCLOAK_URL', 'http://localhost:8080');
vi.stubEnv('VITE_KEYCLOAK_REALM', 'edusphere');
vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'edusphere-web');

const MOCK_BRANDING = {
  orgName: 'AcmeCorp',
  logoUrl: '/acme-logo.png',
  primaryColor: '#ff0000',
  secondaryColor: '#00ff00',
  welcomeMessage: 'Welcome to AcmeCorp Learning!',
  ssoProviders: [
    { id: 'google', name: 'Google', type: 'oidc', iconUrl: '/google.svg' },
  ],
};

describe('useBrandedLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state while fetching', () => {
    mockUseQuery.mockReturnValue([{ data: null, fetching: true }]);
    const { result } = renderHook(() => useBrandedLogin('acme'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOrgFound).toBe(false);
  });

  it('returns org branding when data is available', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    const { result } = renderHook(() => useBrandedLogin('acme'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isOrgFound).toBe(true);
    expect(result.current.orgName).toBe('AcmeCorp');
    expect(result.current.logoUrl).toBe('/acme-logo.png');
    expect(result.current.primaryColor).toBe('#ff0000');
    expect(result.current.secondaryColor).toBe('#00ff00');
    expect(result.current.welcomeMessage).toBe(
      'Welcome to AcmeCorp Learning!',
    );
    expect(result.current.ssoProviders).toHaveLength(1);
  });

  it('falls back to EduSphere defaults when no org branding', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: null }, fetching: false },
    ]);
    const { result } = renderHook(() => useBrandedLogin('unknown'));
    expect(result.current.isOrgFound).toBe(false);
    expect(result.current.orgName).toBe('EduSphere');
    expect(result.current.primaryColor).toBe('#2563eb');
    expect(result.current.ssoProviders).toHaveLength(0);
    expect(result.current.welcomeMessage).toBeNull();
  });

  it('provides keycloakAuthUrl for standard login', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    const { result } = renderHook(() => useBrandedLogin('acme'));
    expect(result.current.keycloakAuthUrl).toContain(
      '/realms/edusphere/protocol/openid-connect/auth',
    );
    expect(result.current.keycloakAuthUrl).toContain('client_id=edusphere-web');
  });

  it('builds SSO URL with IdP hint', () => {
    mockUseQuery.mockReturnValue([
      { data: { brandedLoginData: MOCK_BRANDING }, fetching: false },
    ]);
    const { result } = renderHook(() => useBrandedLogin('acme'));
    const ssoUrl = result.current.buildSsoUrl('google');
    expect(ssoUrl).toContain('kc_idp_hint=google');
    expect(ssoUrl).toContain('/realms/edusphere/protocol/openid-connect/auth');
  });

  it('pauses query when slug is empty', () => {
    mockUseQuery.mockReturnValue([{ data: null, fetching: false }]);
    renderHook(() => useBrandedLogin(''));
    const queryArgs = mockUseQuery.mock.calls[0]?.[0];
    expect(queryArgs?.pause).toBe(true);
  });
});

describe('buildKeycloakUrl', () => {
  it('builds correct URL without IdP hint', () => {
    const url = buildKeycloakUrl('acme');
    expect(url).toContain('/realms/edusphere/protocol/openid-connect/auth');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid');
    expect(url).not.toContain('kc_idp_hint');
  });

  it('builds correct URL with IdP hint', () => {
    const url = buildKeycloakUrl('acme', 'azure-ad');
    expect(url).toContain('kc_idp_hint=azure-ad');
  });

  it('encodes redirect URI', () => {
    const url = buildKeycloakUrl('acme');
    expect(url).toContain('redirect_uri=');
    // Should be URL-encoded
    expect(url).toMatch(/redirect_uri=[^&]+%2F/);
  });
});
