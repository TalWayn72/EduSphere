/**
 * offline-db.ts — IndexedDB-backed storage for TanStack Query cache persistence.
 * Allows query results to survive page reloads and short offline periods.
 */
import { get, set, del } from 'idb-keyval';

export const idbStorage = {
  getItem: (key: string): Promise<string | null> =>
    get<string>(key).then((v) => v ?? null),
  setItem: (key: string, value: string): Promise<void> => set(key, value),
  removeItem: (key: string): Promise<void> => del(key),
};
