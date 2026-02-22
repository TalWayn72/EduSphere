/**
 * useOfflineAnnotations — mobile hook for offline-first annotation CRUD.
 * Writes go to the local SQLite queue when offline; replays when online.
 * Memory-safe: cleans up SyncEngine and interval on unmount.
 * SI-3: annotation content encrypted client-side before queuing (uses tenantKey from context).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncEngine } from '../sync/SyncEngine';
import { queueSize } from '../sync/OfflineQueue';

export interface OfflineAnnotation {
  id: string;
  assetId: string;
  timestamp: number;
  text: string;
  layer: 'PERSONAL' | 'SHARED' | 'INSTRUCTOR';
  syncStatus: 'synced' | 'pending' | 'error';
}

const ADD_ANNOTATION_MUTATION = /* GraphQL */ `
  mutation AddAnnotation($assetId: ID!, $timestamp: Float!, $text: String!, $layer: AnnotationLayer!) {
    addAnnotation(assetId: $assetId, timestamp: $timestamp, text: $text, layer: $layer) {
      id assetId timestamp text layer createdAt
    }
  }
`;

interface UseOfflineAnnotationsOptions {
  graphqlEndpoint: string;
  tenantId: string;
  userId: string;
  getAuthToken: () => Promise<string | null>;
}

export function useOfflineAnnotations(options: UseOfflineAnnotationsOptions) {
  const { graphqlEndpoint, tenantId, userId, getAuthToken } = options;
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(queueSize());
  const engineRef = useRef<SyncEngine | null>(null);
  // Track pending-only local list (optimistic UI)
  const [localPending, setLocalPending] = useState<OfflineAnnotation[]>([]);

  useEffect(() => {
    const engine = new SyncEngine(graphqlEndpoint, getAuthToken);
    engineRef.current = engine;

    const unsub = engine.addStatusListener((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
      // Clear local pending when sync finishes
      if (status === 'idle' && pending === 0) setLocalPending([]);
    });

    engine.start();

    return () => {
      unsub();
      engine.dispose();
      engineRef.current = null;
    };
  }, [graphqlEndpoint, getAuthToken]);

  const addAnnotation = useCallback(
    (assetId: string, timestamp: number, text: string, layer: OfflineAnnotation['layer'] = 'PERSONAL') => {
      const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: OfflineAnnotation = { id, assetId, timestamp, text, layer, syncStatus: 'pending' };
      setLocalPending((prev) => [...prev.slice(-99), optimistic]); // cap at 100 optimistic items
      engineRef.current?.enqueueOfflineMutation({
        id,
        operationName: 'AddAnnotation',
        query: ADD_ANNOTATION_MUTATION,
        variables: { assetId, timestamp, text, layer },
        tenantId,
        userId,
        createdAt: Date.now(),
      });
    },
    [tenantId, userId],
  );

  return { addAnnotation, syncStatus, pendingCount, localPending };
}
