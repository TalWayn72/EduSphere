/**
 * useStripeCheckout — Stripe checkout integration hook.
 *
 * Provides checkout session creation, payment status tracking,
 * and redirect handling. Currently mocked — will integrate with
 * Stripe.js and backend checkout API.
 */
import { useState, useCallback } from 'react';

export type CheckoutStatus =
  | 'idle'
  | 'creating'
  | 'redirecting'
  | 'success'
  | 'cancelled'
  | 'error';

export interface CheckoutLineItem {
  itemId: string;
  title: string;
  priceUsdCents: number;
  quantity: number;
}

export interface UseStripeCheckoutReturn {
  status: CheckoutStatus;
  error: string | null;
  sessionId: string | null;
  createCheckoutSession: (items: CheckoutLineItem[]) => Promise<string>;
  resetCheckout: () => void;
}

export function useStripeCheckout(): UseStripeCheckoutReturn {
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const createCheckoutSession = useCallback(
    async (items: CheckoutLineItem[]): Promise<string> => {
      if (items.length === 0) {
        setError('No items in checkout');
        setStatus('error');
        return '';
      }

      setStatus('creating');
      setError(null);

      try {
        // Placeholder — will POST to backend /api/checkout/create-session
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockSessionId = `cs_mock_${Date.now()}`;
        setSessionId(mockSessionId);
        setStatus('redirecting');
        // In production: window.location.href = stripeCheckoutUrl
        return mockSessionId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Checkout failed';
        setError(message);
        setStatus('error');
        return '';
      }
    },
    []
  );

  const resetCheckout = useCallback(() => {
    setStatus('idle');
    setError(null);
    setSessionId(null);
  }, []);

  return {
    status,
    error,
    sessionId,
    createCheckoutSession,
    resetCheckout,
  };
}
