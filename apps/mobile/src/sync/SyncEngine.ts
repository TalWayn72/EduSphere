/**
 * SyncEngine — replays the offline queue when network is restored.
 * Uses expo-network to detect connectivity changes.
 * Memory-safe: subscription unsubscribed on dispose(), interval cleared.
 * Max 3 retries per mutation; permanently failed items are dequeued with error log.
 *
 * Wave 2 additions:
 *   - syncOnAppResume(): triggers sync on AppState background→active transition.
 *   - getSyncStatus(): returns pending count, last-sync timestamp, conflict flag.
 *   - Conflict resolution: last-write-wins via createdAt timestamp comparison.
 */
import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';
import {
  enqueue,
  dequeue,
  peek,
  incrementRetry,
  queueSize,
  addConflict,
  conflictCount,
  QueuedMutation,
} from './OfflineQueue';

export type SyncStatus = 'idle' | 'syncing' | 'error';
type StatusListener = (status: SyncStatus, pending: number) => void;

export interface DetailedSyncStatus {
  pending: number;
  lastSync: Date | null;
  hasConflicts: boolean;
}

const MAX_RETRIES = 3;
const SYNC_INTERVAL_MS = 30_000; // 30 s polling fallback

export class SyncEngine {
  private _status: SyncStatus = 'idle';
  private _listeners: Set<StatusListener> = new Set();
  private _intervalHandle: ReturnType<typeof setInterval> | null = null;
  private _disposed = false;
  private _graphqlEndpoint: string;
  private _getAuthToken: () => Promise<string | null>;
  private _lastSync: Date | null = null;
  private _appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private _prevAppState: AppStateStatus = AppState.currentState;

  constructor(
    graphqlEndpoint: string,
    getAuthToken: () => Promise<string | null>
  ) {
    this._graphqlEndpoint = graphqlEndpoint;
    this._getAuthToken = getAuthToken;
  }

  /** Start the engine: poll + react to network changes. */
  start(): void {
    if (this._disposed) return;
    // Polling fallback (catches edge cases missed by network listener)
    this._intervalHandle = setInterval(() => {
      void this._trySyncAll();
    }, SYNC_INTERVAL_MS);
    // Attempt immediate sync on start
    void this._trySyncAll();
  }

  /** Stop the engine and release resources. Call on app unmount / component destroy. */
  dispose(): void {
    this._disposed = true;
    if (this._intervalHandle !== null) {
      clearInterval(this._intervalHandle);
      this._intervalHandle = null;
    }
    this._appStateSubscription?.remove();
    this._appStateSubscription = null;
    this._listeners.clear();
  }

  /**
   * Subscribe to AppState changes so that sync is triggered when the app
   * returns from the background to the foreground.
   * Call once after start(). dispose() automatically removes the subscription.
   */
  syncOnAppResume(): void {
    if (this._disposed) return;
    if (this._appStateSubscription) return; // already subscribed

    this._appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          this._prevAppState === 'background' &&
          nextState === 'active' &&
          !this._disposed
        ) {
          void this._trySyncAll();
        }
        this._prevAppState = nextState;
      }
    );
  }

  /**
   * Returns a snapshot of the current sync state:
   * - pending: number of mutations waiting to sync
   * - lastSync: timestamp of the last successful sync batch, or null
   * - hasConflicts: true if any mutations exhausted MAX_RETRIES
   */
  getSyncStatus(): DetailedSyncStatus {
    return {
      pending: queueSize(),
      lastSync: this._lastSync,
      hasConflicts: conflictCount() > 0,
    };
  }

  /**
   * Conflict resolution helper — last-write-wins.
   * Given two mutations for the same logical resource, returns the one
   * with the higher `createdAt` timestamp (more recent wins).
   */
  static resolveConflictLastWriteWins(
    a: QueuedMutation,
    b: QueuedMutation
  ): QueuedMutation {
    return a.createdAt >= b.createdAt ? a : b;
  }

  addStatusListener(listener: StatusListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  enqueueOfflineMutation(mutation: Omit<QueuedMutation, 'retryCount'>): void {
    enqueue(mutation);
    this._emit('idle', queueSize());
  }

  private _emit(status: SyncStatus, pending: number): void {
    this._status = status;
    this._listeners.forEach((l) => l(status, pending));
  }

  private async _trySyncAll(): Promise<void> {
    if (this._disposed) return;
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected || !state.isInternetReachable) return;
    if (queueSize() === 0) return;

    this._emit('syncing', queueSize());
    const batch = peek(10);
    let hadError = false;

    for (const mutation of batch) {
      if (this._disposed) break;
      const success = await this._replayMutation(mutation);
      if (success) {
        dequeue(mutation.id);
      } else {
        incrementRetry(mutation.id);
        if (mutation.retryCount + 1 >= MAX_RETRIES) {
          // Give up — remove from queue, persist to conflicts table for user review
          dequeue(mutation.id);
          addConflict(mutation, 'max_retries_exceeded');
          this._emit('error', queueSize());
        }
        hadError = true;
      }
    }

    if (!hadError) {
      this._lastSync = new Date();
    }
    this._emit(hadError ? 'error' : 'idle', queueSize());
  }

  private async _replayMutation(mutation: QueuedMutation): Promise<boolean> {
    try {
      const token = await this._getAuthToken();
      const response = await fetch(this._graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': mutation.tenantId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: mutation.query,
          variables: mutation.variables,
        }),
      });
      if (!response.ok) return false;
      const json = (await response.json()) as { errors?: unknown[] };
      return !json.errors || json.errors.length === 0;
    } catch {
      return false;
    }
  }
}
