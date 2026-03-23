/**
 * useStripeCheckout.test.ts — Unit tests for useStripeCheckout hook.
 *
 * Covers:
 *   - Initial idle state
 *   - Checkout session creation flow
 *   - Error handling for empty items
 *   - Status transitions (idle -> creating -> redirecting)
 *   - Reset functionality
 *   - Session ID generation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStripeCheckout, type CheckoutLineItem } from './useStripeCheckout';

describe('useStripeCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sampleItems: CheckoutLineItem[] = [
    { itemId: 'mkt-1', title: 'ML Course', priceUsdCents: 4999, quantity: 1 },
    { itemId: 'mkt-2', title: 'Business Course', priceUsdCents: 3999, quantity: 1 },
  ];

  it('starts in idle state with no errors', () => {
    const { result } = renderHook(() => useStripeCheckout());
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.sessionId).toBeNull();
  });

  it('sets error when creating session with empty items', async () => {
    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      const sessionId = await result.current.createCheckoutSession([]);
      expect(sessionId).toBe('');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('No items in checkout');
  });

  it('creates checkout session with valid items', async () => {
    const { result } = renderHook(() => useStripeCheckout());

    let sessionId: string = '';
    await act(async () => {
      const promise = result.current.createCheckoutSession(sampleItems);
      vi.advanceTimersByTime(600);
      sessionId = await promise;
    });

    expect(sessionId).toContain('cs_mock_');
    expect(result.current.status).toBe('redirecting');
    expect(result.current.sessionId).toContain('cs_mock_');
    expect(result.current.error).toBeNull();
  });

  it('resets state back to idle', async () => {
    const { result } = renderHook(() => useStripeCheckout());

    await act(async () => {
      const promise = result.current.createCheckoutSession(sampleItems);
      vi.advanceTimersByTime(600);
      await promise;
    });

    expect(result.current.status).toBe('redirecting');

    act(() => {
      result.current.resetCheckout();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.sessionId).toBeNull();
  });

  it('returns session ID from createCheckoutSession', async () => {
    const { result } = renderHook(() => useStripeCheckout());

    let returnedId: string = '';
    await act(async () => {
      const promise = result.current.createCheckoutSession(sampleItems);
      vi.advanceTimersByTime(600);
      returnedId = await promise;
    });

    expect(returnedId).toBe(result.current.sessionId);
  });
});
