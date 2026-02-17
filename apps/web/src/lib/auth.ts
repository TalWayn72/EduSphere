import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
};

export const keycloak = new Keycloak(keycloakConfig);

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role: string;
  scopes: string[];
}

export async function initKeycloak(): Promise<boolean> {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });

    if (authenticated) {
      setupTokenRefresh();
    }

    return authenticated;
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
    return false;
  }
}

export function login(): void {
  keycloak.login({
    redirectUri: window.location.origin,
  });
}

export function logout(): void {
  keycloak.logout({
    redirectUri: window.location.origin,
  });
}

export function getToken(): string | undefined {
  return keycloak.token;
}

export function isAuthenticated(): boolean {
  return keycloak.authenticated ?? false;
}

export function getCurrentUser(): AuthUser | null {
  if (!keycloak.tokenParsed) {
    return null;
  }

  const token = keycloak.tokenParsed as Record<string, unknown>;

  return {
    id: token.sub as string,
    username: token.preferred_username as string,
    email: token.email as string,
    firstName: token.given_name as string,
    lastName: token.family_name as string,
    tenantId: token.tenant_id as string,
    role: token.role as string,
    scopes: (token.scope as string)?.split(' ') ?? [],
  };
}

function setupTokenRefresh(): void {
  setInterval(() => {
    keycloak
      .updateToken(70)
      .then((refreshed) => {
        if (refreshed) {
          // Token refreshed successfully
        }
      })
      .catch(() => {
        console.error('Failed to refresh token');
        logout();
      });
  }, 60000);
}
