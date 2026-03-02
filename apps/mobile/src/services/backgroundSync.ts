import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { database } from './database';
import { ApolloClient, type NormalizedCacheObject } from '@apollo/client';
import type { DocumentNode } from 'graphql';

const BACKGROUND_SYNC_TASK = 'background-sync';

export class BackgroundSyncService {
  private apolloClient?: ApolloClient<NormalizedCacheObject>;

  configureApolloClient(client: ApolloClient<NormalizedCacheObject>) {
    this.apolloClient = client;
  }

  async registerBackgroundSync(): Promise<void> {
    // Define background task
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      try {
        await this.performSync();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background sync failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register background fetch
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  async unregisterBackgroundSync(): Promise<void> {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  }

  async performSync(): Promise<void> {
    console.log('Performing background sync...');

    if (!this.apolloClient) {
      console.warn('Apollo client not configured');
      return;
    }

    await database.init();

    // Get pending mutations
    const pending = await database.getPendingMutations();

    if (pending.length === 0) {
      console.log('No pending mutations');
      return;
    }

    console.log(`Syncing ${pending.length} pending mutations`);

    for (const mutation of pending) {
      try {
        // Execute mutation
        await this.apolloClient.mutate({
          mutation: mutation.mutation as unknown as DocumentNode,
          variables: mutation.variables as Record<string, unknown>,
        });

        // Mark as synced
        await database.updateMutationStatus(mutation.id, 'synced');
        console.log(`Synced mutation ${mutation.id}`);
      } catch (error) {
        console.error(`Failed to sync mutation ${mutation.id}:`, error);
        await database.updateMutationStatus(mutation.id, 'failed');
      }
    }

    // Clean up old cache
    await database.clearOldCache(7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async getStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
    return await BackgroundFetch.getStatusAsync();
  }

  async isRegistered(): Promise<boolean> {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  }
}

export const backgroundSyncService = new BackgroundSyncService();
