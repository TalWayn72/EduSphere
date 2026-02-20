import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as UrqlProvider } from 'urql';
import { urqlClient } from '@/lib/urql-client';
import { queryClient } from '@/lib/query-client';
import { initKeycloak } from '@/lib/auth';
import { router } from '@/lib/router';
import { Toaster } from '@/components/ui/sonner';

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [keycloakReady, setKeycloakReady] = useState(false);

  useEffect(() => {
    initKeycloak()
      .then(() => {
        setKeycloakReady(true);
      })
      .catch((error) => {
        console.error('Keycloak initialization error:', error);
        setKeycloakReady(true);
      });
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
        <Toaster />
        <RouterProvider router={router} />
      </UrqlProvider>
    </QueryClientProvider>
  );
}

export default App;
