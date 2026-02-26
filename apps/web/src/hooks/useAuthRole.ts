/**
 * useAuthRole — returns the current user's role from Keycloak auth context.
 * Returns null when unauthenticated.
 */
import { useMemo } from 'react';
import { getCurrentUser } from '@/lib/auth';

export function useAuthRole(): string | null {
  return useMemo(() => {
    const user = getCurrentUser();
    return user?.role ?? null;
  }, []);
}
