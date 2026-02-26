import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../services/database';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const client = useApolloClient();

  useEffect(() => {
    // Listen to network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);

      // When coming back online, sync pending mutations
      if (online && !isOnline) {
        syncPendingMutations();
      }
    });

    // Load pending count on mount
    loadPendingCount();

    return () => unsubscribe();
  }, []);

  async function loadPendingCount() {
    const pending = await database.getPendingMutations();
    setPendingCount(pending.length);
  }

  async function syncPendingMutations() {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const pending = await database.getPendingMutations();

      for (const item of pending) {
        try {
          // Execute the mutation
          await client.mutate({
            mutation: item.mutation as any,
            variables:
              typeof item.variables === 'string'
                ? JSON.parse(item.variables)
                : item.variables,
          });

          // Mark as synced
          await database.updateMutationStatus(item.id, 'synced');
          setPendingCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
          console.error('Failed to sync mutation:', error);
          await database.updateMutationStatus(item.id, 'failed');
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingMutations,
  };
}
