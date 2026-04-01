/**
 * useBrandedLogin — Hook for loading org branding config for the login page.
 * Combines ThemeProvider/tenant context with Keycloak auth flow.
 * Falls back to default EduSphere branding if no org config is available.
 */
import { useMemo } from 'react';
import { useQuery } from 'urql';
import { BRANDED_LOGIN_DATA_QUERY } from '@/lib/graphql/branding.queries';
import { DEFAULT_BRANDING } from '@/lib/branding';

export interface BrandedLoginConfig {
  /** Organization display name */
  orgName: string;
  /** Logo URL (null = use default icon) */
  logoUrl: string | null;
  /** Primary brand color for buttons/accents */
  primaryColor: string;
  /** Secondary brand color */
  secondaryColor: string;
  /** Welcome message shown below org name */
  welcomeMessage: string | null;
  /** SSO identity providers configured for this org */
  ssoProviders: SsoProvider[];
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether the org was found */
  isOrgFound: boolean;
  /** Keycloak auth URL for standard login */
  keycloakAuthUrl: string;
  /** Build Keycloak URL with optional IdP hint for SSO */
  buildSsoUrl: (idpHint: string) => string;
}

export interface SsoProvider {
  id: string;
  name: string;
  type: string;
  iconUrl: string | null;
}

interface BrandedLoginQueryResult {
  brandedLoginData: {
    orgName: string;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    welcomeMessage: string | null;
    ssoProviders: SsoProvider[];
  } | null;
}

/** Build a Keycloak OIDC authorization URL. */
export function buildKeycloakUrl(slug: string, idpHint?: string): string {
  const base = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'edusphere';
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'edusphere-web';
  const redirectUri = encodeURIComponent(
    `${window.location.origin}/oauth/google/callback`
  );
  let url =
    `${base}/realms/${realm}/protocol/openid-connect/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=openid%20profile%20email`;
  if (idpHint) {
    url += `&kc_idp_hint=${encodeURIComponent(idpHint)}`;
  }
  return url;
}

/**
 * Hook that loads branded login configuration for an org slug.
 * Falls back to EduSphere defaults when no org branding is found.
 */
export function useBrandedLogin(slug: string): BrandedLoginConfig {
  const [{ data, fetching }] = useQuery<BrandedLoginQueryResult>({
    query: BRANDED_LOGIN_DATA_QUERY,
    variables: { slug },
    pause: !slug,
    requestPolicy: 'cache-and-network',
  });

  const branding = data?.brandedLoginData ?? null;

  const keycloakAuthUrl = useMemo(() => buildKeycloakUrl(slug), [slug]);

  const buildSsoUrl = useMemo(
    () => (idpHint: string) => buildKeycloakUrl(slug, idpHint),
    [slug]
  );

  return {
    orgName: branding?.orgName ?? DEFAULT_BRANDING.organizationName,
    logoUrl: branding?.logoUrl ?? null,
    primaryColor: branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    welcomeMessage: branding?.welcomeMessage ?? null,
    ssoProviders: branding?.ssoProviders ?? [],
    isLoading: fetching,
    isOrgFound: branding !== null,
    keycloakAuthUrl,
    buildSsoUrl,
  };
}
