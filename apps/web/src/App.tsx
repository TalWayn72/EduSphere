import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as UrqlProvider } from 'urql';
import { urqlClient } from '@/lib/urql-client';
import { queryClient } from '@/lib/query-client';
import { initKeycloak } from '@/lib/auth';
import { initI18n, applyDocumentDirection } from '@/lib/i18n';
import { router } from '@/lib/router';
import { Toaster } from '@/components/ui/sonner';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [keycloakReady, setKeycloakReady] = useState(false);

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
      setKeycloakReady(true);
    }
    void bootstrap();
  }, []);

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
    <QueryClientProvider client={queryClient}>
      <UrqlProvider value={urqlClient}>
        <StorageWarningBanner />
        <Toaster />
        <RouterProvider router={router} />
      </UrqlProvider>
    </QueryClientProvider>
  );
}

export default App;
