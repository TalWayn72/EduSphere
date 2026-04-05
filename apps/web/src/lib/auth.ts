import Keycloak from 'keycloak-js';

// SessionStorage key for explicit dev-mode login persistence across page reloads.
// Only set after user calls login(); cleared on tab/window close.
export const DEV_LOGGED_IN_KEY = 'edusphere_dev_logged_in';

/** @deprecated Use DEV_LOGGED_IN_KEY. Kept for backward-compat cleanup in logout(). */
const _DEV_LOGOUT_KEY_LEGACY = 'edusphere_dev_logged_out';

export const DEV_MODE =
  import.meta.env.VITE_DEV_MODE === 'true' ||
  !import.meta.env.VITE_KEYCLOAK_URL;

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'edusphere',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'edusphere-web',
};

export const keycloak = DEV_MODE ? null : new Keycloak(keycloakConfig);

// Guard: init() called once. StrictMode double-invocations share this promise.
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

// Mock user for development — ID matches the seeded super.admin@edusphere.dev
// row in the users table (run `pnpm --filter @edusphere/db seed` to provision).
const DEV_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'super.admin',
  email: 'super.admin@edusphere.dev',
  firstName: 'Super',
  lastName: 'Admin',
  tenantId: '00000000-0000-0000-0000-000000000000',
  role: 'SUPER_ADMIN',
  scopes: ['read', 'write', 'admin'],
};

let devAuthenticated = false;
let devToken = 'dev-token-mock-jwt';

// Module-level handle so the token-refresh interval can be cleared on logout
// or if setupTokenRefresh() is called more than once (e.g. hot-reload).
let _tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

// BUG-068: Maximum time (ms) to wait for keycloak.init() before giving up.
// If the token exchange hangs (e.g. Keycloak server unreachable during code
// exchange after login redirect), the app must not stay on the spinner forever.
const KEYCLOAK_INIT_TIMEOUT_MS = 10_000;

export function initKeycloak(): Promise<boolean> {
  if (DEV_MODE) {
    if (import.meta.env.DEV)
      console.warn('[Auth] DEV MODE: Running without Keycloak authentication');
    devAuthenticated =
      window.sessionStorage.getItem(DEV_LOGGED_IN_KEY) === 'true';
    return Promise.resolve(devAuthenticated);
  }

  // Return the in-flight promise (StrictMode double-call guard).
  if (initPromise) {
    return initPromise;
  }

  const kcInitPromise = keycloak!
    .init({
      onLoad: 'check-sso',
      // BUG-01: silentCheckSsoRedirectUri removed — CSP blocks the hidden
      // iframe on fresh sessions, causing init() to hang indefinitely.
      // checkLoginIframe: false disables the periodic session-validity
      // polling iframe (same CSP class of issue).
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
      console.error('[Auth] Keycloak initialization failed:', error);
      throw error;
    });

  // BUG-068: Race the init against a timeout so the app never stays on the
  // "Initializing authentication..." spinner forever.  If the Keycloak token
  // exchange hangs (e.g. server unreachable after login redirect), we fall
  // back to unauthenticated state after KEYCLOAK_INIT_TIMEOUT_MS.
  //
  // Late-auth recovery: if the timeout fires first but Keycloak eventually
  // authenticates, we dispatch a 'keycloak-late-auth' event so App.tsx can
  // seamlessly transition the UI to the authenticated state.
  let didTimeout = false;
  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      didTimeout = true;
      console.warn(
        `[Auth] Keycloak init timed out after ${KEYCLOAK_INIT_TIMEOUT_MS}ms — continuing unauthenticated. Will recover if auth completes later.`
      );
      resolve(false);
    }, KEYCLOAK_INIT_TIMEOUT_MS);
  });

  initPromise = Promise.race([kcInitPromise, timeoutPromise]);

  // Late-auth recovery: if the timeout won but Keycloak eventually succeeds,
  // set up token refresh and notify the app so it can re-render as authenticated.
  kcInitPromise
    .then((authenticated) => {
      if (didTimeout && authenticated) {
        console.warn(
          '[Auth] Keycloak authenticated after timeout — recovering session.'
        );
        setupTokenRefresh();
        window.dispatchEvent(new Event('keycloak-late-auth'));
      }
    })
    .catch(() => {
      // kcInitPromise rejection is already handled above (line 121-125).
      // Nothing to do here — avoid unhandled rejection.
    });

  return initPromise;
}

/** SessionStorage key — cleared on login/logout so GlobalLocaleSync re-syncs from DB. */
export const LOCALE_SYNCED_KEY = 'edusphere_locale_synced';

export function login(): void {
  if (DEV_MODE) {
    window.sessionStorage.setItem(DEV_LOGGED_IN_KEY, 'true');
    // BUG-091: Clear locale-sync flag so GlobalLocaleSync re-reads DB locale
    // after the full page reload.  Without this, a stale localStorage value
    // would be trusted even though the DB has a different user preference.
    window.sessionStorage.removeItem(LOCALE_SYNCED_KEY);
    devAuthenticated = true;
    const devRedirect =
      window.sessionStorage.getItem('post_login_redirect') ?? '/';
    window.sessionStorage.removeItem('post_login_redirect');
    window.location.href = devRedirect;
    return;
  }

  // BUG-091: Clear locale-sync flag before Keycloak redirect
  window.sessionStorage.removeItem(LOCALE_SYNCED_KEY);
  keycloak!.login({
    redirectUri: window.location.href,
  });
}

export function logout(): void {
  if (DEV_MODE) {
    devAuthenticated = false;
    clearTokenRefresh();
    // Remove the logged-in flag so the next initKeycloak() (page reload)
    // starts unauthenticated and shows the login screen again.
    window.sessionStorage.removeItem(DEV_LOGGED_IN_KEY);
    // Also purge any legacy "logged-out" key left by older builds.
    window.sessionStorage.removeItem(_DEV_LOGOUT_KEY_LEGACY);
    // BUG-091: Clear locale-sync flag so next login triggers DB re-sync
    window.sessionStorage.removeItem(LOCALE_SYNCED_KEY);
    window.location.href = '/login';
    return;
  }

  clearTokenRefresh();
  // BUG-091: Clear locale-sync flag before Keycloak logout redirect
  window.sessionStorage.removeItem(LOCALE_SYNCED_KEY);
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

/**
 * Returns the access token expiry timestamp (seconds since epoch), or null
 * if unavailable (dev mode / not authenticated).
 */
export function getTokenExpiry(): number | null {
  if (DEV_MODE || !keycloak?.tokenParsed) return null;
  const exp = (keycloak.tokenParsed as Record<string, unknown>).exp;
  return typeof exp === 'number' ? exp : null;
}

/**
 * Attempts to refresh the Keycloak access token.
 * Resolves `true` if the token was actually refreshed, `false` if still valid.
 * Rejects on failure (e.g. refresh token expired).
 */
export function refreshToken(minValidity = 70): Promise<boolean> {
  if (DEV_MODE || !keycloak) return Promise.resolve(false);
  return keycloak.updateToken(minValidity);
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
        // FE-2: Do NOT call logout() here — the useTokenExpiryWatcher hook
        // will detect the expired token and show a re-auth dialog instead
        // of abruptly redirecting the user to the login page.
        console.error(
          '[Auth] Silent token refresh failed — session may expire soon.'
        );
      });
  }, 60000);
}
