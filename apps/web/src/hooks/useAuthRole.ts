/**
 * useAuthRole — returns the current user's role from Keycloak auth context.
 * Returns null when unauthenticated.
 *
 * Reactive: re-evaluates when:
 *   - Keycloak completes late auth after a timeout ('keycloak-late-auth' event)
 *   - sessionStorage changes (DEV_MODE login/logout)
 */
import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';

export function useAuthRole(): string | null {
  const [role, setRole] = useState<string | null>(() => {
    const user = getCurrentUser();
    return user?.role ?? null;
  });

  useEffect(() => {
    function refresh() {
      const user = getCurrentUser();
      setRole(user?.role ?? null);
    }

    window.addEventListener('keycloak-late-auth', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('keycloak-late-auth', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return role;
}
