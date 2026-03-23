/**
 * useSubscription — Hook for reading org subscription/trial state.
 */

export interface UseSubscriptionReturn {
  status: string;
  daysRemaining: number;
  planName: string;
}

export function useSubscription(): UseSubscriptionReturn {
  // Placeholder — will be wired to billing API
  return {
    status: 'active',
    daysRemaining: 0,
    planName: 'FREE',
  };
}
