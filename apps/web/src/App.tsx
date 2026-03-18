import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as UrqlProvider } from 'urql';
import { urqlClient } from '@/lib/urql-client';
import { queryClient } from '@/lib/persisted-query-client';
import { initKeycloak, isAuthenticated } from '@/lib/auth';
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
  const params = new URLSearchParams(window.location.search);
  return params.has('code') && params.has('state');
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
  for (const p of kcParams) {
    if (url.searchParams.has(p)) {
      url.searchParams.delete(p);
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

  // Register the PWA service worker once on mount (production only)
  useEffect(() => {
    registerServiceWorker();
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

      // BUG-068: After a Keycloak login redirect, the router was created at
      // module-load time with the stale ?code=...&state=... URL.  keycloak-js
      // cleaned the URL via history.replaceState(), but the router's internal
      // history doesn't listen for replaceState — only popstate.  This leaves
      // the router stuck on the old URL and lazy route chunks may never resolve
      // because the router's location doesn't match any configured route path
      // cleanly (the query params confuse client-side matching in some edge
      // cases with nested Suspense boundaries).
      //
      // Fix: after successful auth from a redirect, ensure the URL is clean
      // and explicitly tell the router to navigate to /dashboard so it picks
      // up the clean URL and renders the authenticated route tree.
      if (_wasKeycloakRedirect) {
        // Safety net: strip leftover auth params if keycloak-js didn't
        cleanKeycloakUrlParams();

        if (isAuthenticated()) {
          router.navigate('/dashboard', { replace: true });
        }
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
              <SessionExpiryDialog open={sessionExpired} onReLogin={handleReLogin} />
              <ErrorBoundary pageName="App">
                <RouterProvider router={router} />
              </ErrorBoundary>
            </TooltipProvider>
          </BrandingProvider>
        </UrqlProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
