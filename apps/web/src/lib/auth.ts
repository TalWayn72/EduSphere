import Keycloak from 'keycloak-js';

const DEV_MODE =
  import.meta.env.VITE_DEV_MODE === 'true' ||
  !import.meta.env.VITE_KEYCLOAK_URL;

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'edusphere',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'edusphere-app',
};

export const keycloak = DEV_MODE ? null : new Keycloak(keycloakConfig);

// Guard: Keycloak.init() must only be called once per instance.
// React StrictMode runs effects twice in development. Using a shared
// promise ensures both invocations wait for the SAME init() call to
// complete — the second caller returns the already-in-flight promise
// instead of returning false immediately (which would cause the router
// to render before authentication is established).
let initPromise: Promise<boolean> | null = null;

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

// Module-level handle so the token-refresh interval can be cleared on logout
// or if setupTokenRefresh() is called more than once (e.g. hot-reload).
let _tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

export function initKeycloak(): Promise<boolean> {
  // Development mode - skip Keycloak
  if (DEV_MODE) {
    console.warn('🔧 DEV MODE: Running without Keycloak authentication');
    devAuthenticated = true;
    return Promise.resolve(true);
  }

  // Return the in-flight promise if init is already running.
  // React StrictMode calls effects twice in development; the second caller
  // must wait for the same init() rather than short-circuiting with `false`
  // (which would cause the router to render before authentication completes).
  if (initPromise) {
    return initPromise;
  }

  initPromise = keycloak!
    .init({
      onLoad: 'check-sso',
      // BUG-01 fix: silentCheckSsoRedirectUri was removed because it causes
      // keycloak-js to open a hidden iframe back to the Keycloak server to
      // perform the silent SSO check. Keycloak's default CSP sets
      // `frame-ancestors 'self'`, which blocks that iframe from loading on a
      // fresh browser session. The iframe never fires its postMessage so
      // Keycloak.init() never resolves, leaving the app stuck on the
      // "Initializing authentication..." spinner indefinitely.
      //
      // Without silentCheckSsoRedirectUri, keycloak-js performs the SSO
      // check via a redirect instead of an iframe. The redirect resolves
      // immediately when no session exists (returning authenticated=false)
      // and restores an existing session normally when one is present.
      //
      // checkLoginIframe: false additionally disables the periodic
      // session-validity polling iframe that keycloak-js would otherwise
      // start after a successful login — eliminating the same class of CSP
      // issue for the ongoing session lifecycle.
      checkLoginIframe: false,
      pkceMethod: 'S256',
    })
    .then((authenticated) => {
      if (authenticated) {
        setupTokenRefresh();
      }
      return authenticated;
    })
    .catch((error) => {
      initPromise = null; // allow retry on genuine errors
      console.error('Keycloak initialization failed:', error);
      throw error;
    });

  return initPromise;
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
    clearTokenRefresh();
    window.location.href = '/login';
    return;
  }

  clearTokenRefresh();
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

// Roles assigned in Keycloak realm (appear in realm_access.roles in the JWT).
const KNOWN_ROLES = [
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
  'STUDENT',
  'RESEARCHER',
] as const;

export function getCurrentUser(): AuthUser | null {
  if (DEV_MODE) {
    return devAuthenticated ? DEV_USER : null;
  }

  if (!keycloak?.tokenParsed) {
    return null;
  }

  const token = keycloak.tokenParsed as Record<string, unknown>;

  // Roles live in realm_access.roles (Keycloak default).
  // Fall back to a top-level `role` claim if a custom mapper is configured.
  const realmRoles = (token.realm_access as { roles?: string[] })?.roles ?? [];
  const role =
    realmRoles.find((r) =>
      KNOWN_ROLES.includes(r as (typeof KNOWN_ROLES)[number])
    ) ??
    (token.role as string | undefined) ??
    'STUDENT';

  return {
    id: token.sub as string,
    username: token.preferred_username as string,
    email: token.email as string,
    firstName: (token.given_name as string) ?? '',
    lastName: (token.family_name as string) ?? '',
    tenantId: (token.tenant_id as string) ?? '',
    role,
    scopes: (token.scope as string)?.split(' ') ?? [],
  };
}

export function clearTokenRefresh(): void {
  if (_tokenRefreshInterval !== null) {
    clearInterval(_tokenRefreshInterval);
    _tokenRefreshInterval = null;
  }
}

function setupTokenRefresh(): void {
  if (DEV_MODE || !keycloak) return;

  if (_tokenRefreshInterval !== null) {
    clearInterval(_tokenRefreshInterval);
  }
  _tokenRefreshInterval = setInterval(() => {
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
