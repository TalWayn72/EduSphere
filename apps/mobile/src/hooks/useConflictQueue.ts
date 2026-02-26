/**
 * useConflictQueue — exposes permanently failed offline mutations to the UI.
 * User can acknowledge (dismiss) each conflict individually.
 * Memory-safe: no intervals, loads on mount only.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getConflicts,
  resolveConflict,
  conflictCount,
  type ConflictedMutation,
} from '../sync/OfflineQueue';

interface UseConflictQueueReturn {
  conflicts: ConflictedMutation[];
  hasConflicts: boolean;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export function useConflictQueue(): UseConflictQueueReturn {
  const [conflicts, setConflicts] = useState<ConflictedMutation[]>([]);

  const reload = useCallback(() => {
    setConflicts(getConflicts());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const dismiss = useCallback(
    (id: string) => {
      resolveConflict(id);
      reload();
    },
    [reload]
  );

  const dismissAll = useCallback(() => {
    conflicts.forEach((c) => resolveConflict(c.id));
    setConflicts([]);
  }, [conflicts]);

  return {
    conflicts,
    hasConflicts: conflictCount() > 0,
    dismiss,
    dismissAll,
  };
}
