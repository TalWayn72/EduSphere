import { useEffect, useRef, useCallback } from 'react';
import { openDB, type IDBPDatabase } from 'idb';
import type { VisualAnchor } from '@/components/visual-anchoring/visual-anchor.types';
import { useOfflineStatus } from './useOfflineStatus';

const DB_NAME = 'edusphere_visual_anchors';
const STORE_NAME = 'anchors';
const DB_VERSION = 1;

interface AnchorRecord {
  assetId: string;
  anchors: VisualAnchor[];
  cachedAt: number;
}

/**
 * Stores and retrieves visual anchors from IndexedDB for offline support.
 * Falls back to localStorage if IndexedDB is unavailable.
 * Memory-safe: closes DB on unmount.
 */
export function useOfflineAnchors(assetId: string) {
  const dbRef = useRef<IDBPDatabase | null>(null);
  const { isOnline } = useOfflineStatus();

  const openDatabase = useCallback(async () => {
    try {
      dbRef.current = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'assetId' });
          }
        },
      });
    } catch {
      // IndexedDB unavailable (private browsing, etc.) — use localStorage fallback
      dbRef.current = null;
    }
  }, []);

  useEffect(() => {
    void openDatabase();
    return () => {
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, [openDatabase]);

  const storeAnchors = useCallback(
    async (anchors: VisualAnchor[]): Promise<void> => {
      if (dbRef.current) {
        await dbRef.current.put(STORE_NAME, {
          assetId,
          anchors,
          cachedAt: Date.now(),
        } satisfies AnchorRecord);
      } else {
        // Fallback: localStorage with JSON serialization
        try {
          localStorage.setItem(
            `edusphere_anchors_${assetId}`,
            JSON.stringify({ anchors, cachedAt: Date.now() })
          );
        } catch {
          // localStorage full — silent fail
        }
      }
    },
    [assetId]
  );

  const loadCachedAnchors = useCallback(async (): Promise<VisualAnchor[] | null> => {
    if (dbRef.current) {
      const record = (await dbRef.current.get(STORE_NAME, assetId)) as
        | AnchorRecord
        | undefined;
      return record?.anchors ?? null;
    }
    // Fallback: localStorage
    try {
      const raw = localStorage.getItem(`edusphere_anchors_${assetId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { anchors: VisualAnchor[] };
      return parsed.anchors ?? null;
    } catch {
      return null;
    }
  }, [assetId]);

  return { storeAnchors, loadCachedAnchors, isOnline };
}
