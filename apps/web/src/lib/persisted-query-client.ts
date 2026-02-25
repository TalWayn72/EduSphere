/**
 * persisted-query-client.ts — QueryClient with IndexedDB persistence.
 * Queries are re-hydrated from IDB on page load (fast initial render).
 * Cache is persisted every 1 second while active.
 * Max age: 24 hours (prevents stale data after long offline periods).
 */
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { idbStorage } from './offline-db';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000, // 24h — keep cache alive for offline
      retry: 2,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: 'edusphere-query-cache',
  throttleTime: 1_000,
});

// Boot: restore cache from IDB, then keep it in sync
persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60_000, // 24 hours
  buster: 'v1',
});
