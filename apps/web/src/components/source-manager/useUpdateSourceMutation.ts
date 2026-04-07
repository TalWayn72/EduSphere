/**
 * TanStack Query mutation hook for updating a knowledge source title/metadata.
 */
import { useMutation } from '@tanstack/react-query';
import { gqlClient as graphqlClient } from '@/lib/graphql';
import { UPDATE_KNOWLEDGE_SOURCE } from '@/lib/graphql/sources.queries';
import {
  IS_DEV_MODE,
  authHeaders,
  getSourceErrorKey,
  hasValidAuth,
} from './utils';

interface UpdateSourceInput {
  id: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

interface MutationCallbacks {
  onUpdated: () => void;
  setError: (msg: string) => void;
  t: (key: string) => string;
}

function requireAuth(): void {
  if (!hasValidAuth()) {
    throw new Error('Not authenticated — please log in to update sources');
  }
}

export function useUpdateSourceMutation({
  onUpdated,
  setError,
  t,
}: MutationCallbacks) {
  return useMutation({
    mutationFn: IS_DEV_MODE
      ? ({ id, title, metadata }: UpdateSourceInput) =>
          Promise.resolve({ id, title: title ?? 'Updated', metadata })
      : ({ id, title, metadata }: UpdateSourceInput) => {
          requireAuth();
          return graphqlClient.request(
            UPDATE_KNOWLEDGE_SOURCE,
            { id, input: { title, metadata } },
            authHeaders()
          );
        },
    onSuccess: () => {
      onUpdated();
    },
    onError: (e) => setError(t(getSourceErrorKey(e))),
  });
}
