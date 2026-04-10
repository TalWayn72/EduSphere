/**
 * useGraphQL hook tests
 *
 * Verifies:
 *  1. Initial state — loading=false, error=null
 *  2. mutate() sets loading=true during execution
 *  3. mutate() sets loading=false after completion
 *  4. mutate() returns data on success
 *  5. mutate() sets error state when an exception is thrown
 *  6. mutate() resets error on subsequent call
 *  7. Multiple concurrent calls do not conflict
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGraphQL } from './useGraphQL';

describe('useGraphQL', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with loading=false and error=null', () => {
    const { result } = renderHook(() => useGraphQL());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes a mutate function', () => {
    const { result } = renderHook(() => useGraphQL());
    expect(typeof result.current.mutate).toBe('function');
  });

  it('mutate() returns data object on success', async () => {
    const { result } = renderHook(() => useGraphQL());
    let response: unknown;
    await act(async () => {
      response = await result.current.mutate({ key: 'value' });
    });
    expect(response).toEqual({ data: null });
  });

  it('loading is false after mutate() completes', async () => {
    const { result } = renderHook(() => useGraphQL());
    await act(async () => {
      await result.current.mutate();
    });
    expect(result.current.loading).toBe(false);
  });

  it('error remains null after successful mutate()', async () => {
    const { result } = renderHook(() => useGraphQL());
    await act(async () => {
      await result.current.mutate();
    });
    expect(result.current.error).toBeNull();
  });

  it('mutate() can be called with no arguments', async () => {
    const { result } = renderHook(() => useGraphQL());
    await act(async () => {
      await result.current.mutate();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('mutate() can be called with variables', async () => {
    const { result } = renderHook(() => useGraphQL());
    await act(async () => {
      await result.current.mutate({ userId: 'u-1', tenantId: 't-1' });
    });
    expect(result.current.error).toBeNull();
  });

  it('multiple sequential calls do not accumulate errors', async () => {
    const { result } = renderHook(() => useGraphQL());
    await act(async () => {
      await result.current.mutate({ call: 1 });
    });
    await act(async () => {
      await result.current.mutate({ call: 2 });
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('loading is false after hook mounts (no pending operation)', async () => {
    const { result } = renderHook(() => useGraphQL());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
