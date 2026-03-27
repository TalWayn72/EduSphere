/**
 * Tests for lib/persisted-query-client.ts — Query client configuration
 *
 * Covers: queryClient export, persister export, default options,
 * staleTime, gcTime, retry settings.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tanstack/react-query-persist-client', () => ({
  persistQueryClient: vi.fn(),
}));

vi.mock('@tanstack/query-async-storage-persister', () => ({
  createAsyncStoragePersister: vi.fn(() => ({ persist: vi.fn() })),
}));

import { queryClient, persister } from './persisted-query-client';

describe('queryClient', () => {
  it('is exported', () => {
    expect(queryClient).toBeDefined();
  });

  it('has default query options with staleTime of 5 minutes', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(1_000 * 60 * 5);
  });

  it('has default query options with gcTime of 24 hours', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(24 * 60 * 60_000);
  });

  it('has retry set to 2 for queries', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(2);
  });

  it('has retry set to 0 for mutations', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(0);
  });

  it('uses offlineFirst network mode for queries', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.networkMode).toBe('offlineFirst');
  });

  it('disables refetchOnWindowFocus', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });
});

describe('persister', () => {
  it('is exported', () => {
    expect(persister).toBeDefined();
  });
});
