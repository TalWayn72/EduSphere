import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as UrqlProvider } from 'urql';
import { urqlClient } from '@/lib/urql-client';
import { queryClient } from '@/lib/persisted-query-client';
import { initKeycloak, isAuthenticated } from '@/lib/auth';
import { AUTH_LOGIN_TIMESTAMP_KEY } from '@/lib/urql-client';
import { POST_LOGIN_REDIRECT_KEY } from '@/components/ProtectedRoute';
import { initI18n, applyDocumentDirection } from '@/lib/i18n';
import { router } from '@/lib/router';
import { Toaster } from '@/components/ui/sonner';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';
import { GlobalLocaleSync } from '@/components/GlobalLocaleSync';
import { SessionExpiryDialog } from '@/components/SessionExpiryDialog';
import { useTokenExpiryWatcher } from '@/hooks/useTokenExpiryWatcher';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DirectionProvider } from '@/contexts/DirectionContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { SkipLinks } from '@/components/a11y/SkipLinks';
import { registerServiceWorker } from '@/pwa';
import { WebSiteSchema, OrganizationSchema } from '@/components/seo';

// ── Keycloak redirect detection ─────────────────────────────────────────────
// After Keycloak login, the browser is redirected back with ?code=...&state=...
// in the URL.  keycloak-js processes these params during init() and cleans them
// via history.replaceState().  However, createBrowserRouter (imported above) was
// already created at module-load time with the stale URL that included the auth
// params.  After keycloak-js cleans the URL, the router's internal location is
// out of sync with window.location — it still "sees" the auth-param URL.
//
// BUG-068 fix: detect the redirect params BEFORE init, then after init resolves
// with authenticated=true, explicitly navigate the router to /dashboard so it
// picks up the clean URL and renders the authenticated route tree.
function hasKeycloakRedirectParams(): boolean {
  // Keycloak-js uses response_mode=fragment by default for public clients with
  // PKCE.  In fragment mode the auth params arrive in window.location.hash
  // (e.g. /#state=...&code=...), NOT in window.location.search.  Check both.
  const queryParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, '')
  );
  return (
    (queryParams.has('code') && queryParams.has('state')) ||
    (hashParams.has('code') && hashParams.has('state'))
  );
}

// Snapshot the flag once at module load — keycloak.init() will clear the params.
const _wasKeycloakRedirect = hasKeycloakRedirectParams();

/**
 * Remove Keycloak auth params from the URL if keycloak-js didn't clean them.
 * Uses history.replaceState so the browser doesn't navigate.
 */
function cleanKeycloakUrlParams(): void {
  const url = new URL(window.location.href);
  const kcParams = ['code', 'state', 'session_state', 'iss'];
  let changed = false;
  // Clean from query string
  for (const p of kcParams) {
    if (url.searchParams.has(p)) {
      url.searchParams.delete(p);
      changed = true;
    }
  }
  // Clean from hash fragment (fragment response_mode)
  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    let hashChanged = false;
    for (const p of kcParams) {
      if (hashParams.has(p)) {
        hashParams.delete(p);
        hashChanged = true;
      }
    }
    if (hashChanged) {
      const remaining = hashParams.toString();
      url.hash = remaining ? `#${remaining}` : '';
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState(window.history.state, '', url.toString());
  }
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [keycloakReady, setKeycloakReady] = useState(false);
  // Counter incremented when Keycloak authenticates after the init timeout.
  // Triggers a re-render so the app picks up the now-authenticated state.
  const [, setLateAuthTick] = useState(0);

  // Register the PWA service worker once on mount (production only)
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Late-auth recovery: if Keycloak init timed out but authentication
  // eventually succeeded, the auth module dispatches 'keycloak-late-auth'.
  // We listen for it here and trigger a re-render so that isAuthenticated()
  // returns true and the router navigates to the authenticated route tree.
  useEffect(() => {
    function handleLateAuth() {
      setLateAuthTick((t) => t + 1);
      // BUG-redirect-loop: Record login timestamp on late auth recovery too.
      if (isAuthenticated()) {
        window.sessionStorage.setItem(AUTH_LOGIN_TIMESTAMP_KEY, String(Date.now()));
      }
      // If this was originally a Keycloak redirect, navigate to saved destination
      // (or /dashboard as fallback) now that auth has recovered.
      if (_wasKeycloakRedirect && isAuthenticated()) {
        cleanKeycloakUrlParams();
        const dest =
          window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) ?? '/dashboard';
        window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
        router.navigate(dest, { replace: true });
      }
    }
    window.addEventListener('keycloak-late-auth', handleLateAuth);
    return () =>
      window.removeEventListener('keycloak-late-auth', handleLateAuth);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initKeycloak();
      } catch {
        // Keycloak init failure is non-fatal — app continues in unauthenticated state
      }
      // Initialize i18n with cached locale from localStorage (before DB fetch)
      const cachedLocale =
        localStorage.getItem('edusphere_locale') ?? undefined;
      await initI18n(cachedLocale);
      // Apply RTL direction immediately from cached locale (before DB fetch)
      if (cachedLocale) applyDocumentDirection(cachedLocale);

      // BUG-068 + BUG-107: After a Keycloak login redirect, ensure clean URL and
      // navigate to the correct destination before unmounting the spinner.
      //
      // The original BUG-068 fix only guarded with `_wasKeycloakRedirect` but
      // that flag relied on detecting Keycloak params in the URL before keycloak-js
      // cleared them.  In fragment response_mode, params arrive in the hash which
      // keycloak-js clears synchronously — making the detection unreliable.
      //
      // BUG-107 fix: always check for a saved post_login_redirect destination when
      // authentication succeeds, regardless of how we got here.  This is safe
      // because:
      //   - The key is only set by ProtectedRoute (protected pages) when the user
      //     is not authenticated.
      //   - It is removed immediately after being read here.
      //   - If no key exists, fall through to normal routing (no navigation).
      //
      // Also always clean any stale Keycloak URL params (safety net).
      cleanKeycloakUrlParams();

      if (isAuthenticated()) {
        // BUG-redirect-loop: Record login timestamp so urql-client suppresses
        // premature logout if the first GraphQL requests return 401 (subgraph
        // JWKS cache not yet refreshed after the Keycloak login redirect).
        window.sessionStorage.setItem(AUTH_LOGIN_TIMESTAMP_KEY, String(Date.now()));

        const dest = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
        if (dest) {
          window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
          // Await so router state is updated before RouterProvider mounts.
          // Without await, setKeycloakReady() fires while navigation is pending
          // and RouterProvider picks up the stale location (/).
          await router.navigate(dest, { replace: true });
        }
      } else if (_wasKeycloakRedirect) {
        // Was a Keycloak redirect but auth failed — navigate to dashboard root
        // so the router doesn't stay stuck on a stale URL with auth params.
        await router.navigate('/dashboard', { replace: true });
      }

      setKeycloakReady(true);
    }
    void bootstrap();
  }, []);

  // FE-2: Watch JWT expiry — warn before expiry, show re-auth dialog on expire.
  // The hook is safe to call before keycloakReady (it no-ops when not authenticated).
  const { expired: sessionExpired, handleReLogin } = useTokenExpiryWatcher();

  if (!keycloakReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Initializing authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <DirectionProvider>
        <WebSiteSchema />
        <OrganizationSchema />
        <SkipLinks />
        <QueryClientProvider client={queryClient}>
          <UrqlProvider value={urqlClient}>
            <BrandingProvider>
              <TooltipProvider>
                <GlobalLocaleSync />
                <StorageWarningBanner />
                <Toaster />
                <SessionExpiryDialog
                  open={sessionExpired}
                  onReLogin={handleReLogin}
                />
                <ErrorBoundary pageName="App">
                  <RouterProvider router={router} />
                </ErrorBoundary>
              </TooltipProvider>
            </BrandingProvider>
          </UrqlProvider>
        </QueryClientProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}

export default App;
