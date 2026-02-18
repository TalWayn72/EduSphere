import Keycloak from 'keycloak-js';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || !import.meta.env.VITE_KEYCLOAK_URL;

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'edusphere',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'edusphere-app',
};

export const keycloak = DEV_MODE ? null : new Keycloak(keycloakConfig);

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

// Mock user for development
const DEV_USER: AuthUser = {
  id: 'dev-user-1',
  username: 'developer',
  email: 'dev@edusphere.local',
  firstName: 'Dev',
  lastName: 'User',
  tenantId: 'dev-tenant-1',
  role: 'SUPER_ADMIN',
  scopes: ['read', 'write', 'admin'],
};

let devAuthenticated = false;
let devToken = 'dev-token-mock-jwt';

export async function initKeycloak(): Promise<boolean> {
  // Development mode - skip Keycloak
  if (DEV_MODE) {
    console.warn('🔧 DEV MODE: Running without Keycloak authentication');
    devAuthenticated = true;
    return true;
  }

  // Production mode - use real Keycloak
  try {
    const authenticated = await keycloak!.init({
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
    console.warn('🔧 Falling back to DEV MODE');
    devAuthenticated = true;
    return true;
  }
}

export function login(): void {
  if (DEV_MODE) {
    devAuthenticated = true;
    window.location.href = '/';
    return;
  }

  keycloak!.login({
    redirectUri: window.location.origin,
  });
}

export function logout(): void {
  if (DEV_MODE) {
    devAuthenticated = false;
    window.location.href = '/login';
    return;
  }

  keycloak!.logout({
    redirectUri: window.location.origin,
  });
}

export function getToken(): string | undefined {
  if (DEV_MODE) {
    return devToken;
  }

  return keycloak!.token;
}

export function isAuthenticated(): boolean {
  if (DEV_MODE) {
    return devAuthenticated;
  }

  return keycloak?.authenticated ?? false;
}

export function getCurrentUser(): AuthUser | null {
  if (DEV_MODE) {
    return devAuthenticated ? DEV_USER : null;
  }

  if (!keycloak?.tokenParsed) {
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
  if (DEV_MODE || !keycloak) return;

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
