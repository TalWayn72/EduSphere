/**
 * TanStack Query mutation hooks for adding knowledge sources.
 * Extracted from AddSourceModal to keep the modal under 300 lines.
 *
 * BUG-098: Each mutation now pre-checks authentication before sending the
 * GraphQL request. This prevents 400 Bad Request errors from the gateway
 * when the user's Keycloak session has expired or timed out.
 */

import { useMutation } from '@tanstack/react-query';
import { gqlClient as graphqlClient } from '@/lib/graphql';
import {
  ADD_URL_SOURCE,
  ADD_TEXT_SOURCE,
  ADD_YOUTUBE_SOURCE,
  ADD_FILE_SOURCE,
} from '@/lib/graphql/sources.queries';
import type { SourceType } from './types';
import {
  IS_DEV_MODE,
  authHeaders,
  getSourceErrorKey,
  hasValidAuth,
} from './utils';
import { devAddSource } from './dev-mock';

interface MutationCallbacks {
  onAdded: () => void;
  setSuccess: (v: boolean) => void;
  setError: (msg: string) => void;
  t: (key: string) => string;
}

/**
 * Guard that throws a typed error when the user is not authenticated.
 * Caught by TanStack Query's onError → displays a friendly i18n message.
 */
function requireAuth(): void {
  if (!hasValidAuth()) {
    throw new Error('Not authenticated — please log in to add sources');
  }
}

export function useAddUrlMutation({
  onAdded,
  setSuccess,
  setError,
  t,
}: MutationCallbacks) {
  return useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: { courseId: string; title: string; url: string }) =>
          Promise.resolve(devAddSource('URL', input.title, input.url))
      : (input: { courseId: string; title: string; url: string }) => {
          requireAuth();
          return graphqlClient.request(
            ADD_URL_SOURCE,
            { input },
            authHeaders()
          );
        },
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(t(getSourceErrorKey(e))),
  });
}

export function useAddTextMutation({
  onAdded,
  setSuccess,
  setError,
  t,
}: MutationCallbacks) {
  return useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: { courseId: string; title: string; text: string }) =>
          Promise.resolve(devAddSource('TEXT', input.title))
      : (input: { courseId: string; title: string; text: string }) => {
          requireAuth();
          return graphqlClient.request(
            ADD_TEXT_SOURCE,
            { input },
            authHeaders()
          );
        },
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(t(getSourceErrorKey(e))),
  });
}

export function useAddYoutubeMutation({
  onAdded,
  setSuccess,
  setError,
  t,
}: MutationCallbacks) {
  return useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: { courseId: string; title: string; url: string }) =>
          Promise.resolve(devAddSource('YOUTUBE', input.title, input.url))
      : (input: { courseId: string; title: string; url: string }) => {
          requireAuth();
          return graphqlClient.request(
            ADD_YOUTUBE_SOURCE,
            { input },
            authHeaders()
          );
        },
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(t(getSourceErrorKey(e))),
  });
}

export function useAddFileMutation({
  onAdded,
  setSuccess,
  setError,
  t,
}: MutationCallbacks) {
  return useMutation({
    mutationFn: IS_DEV_MODE
      ? (input: {
          courseId: string;
          title: string;
          fileName: string;
          contentBase64: string;
          mimeType: string;
        }) => {
          const lower = input.fileName.toLowerCase();
          const devType: SourceType = lower.endsWith('.docx')
            ? 'FILE_DOCX'
            : lower.endsWith('.txt')
              ? 'FILE_TXT'
              : 'FILE_PDF';
          return Promise.resolve(
            devAddSource(devType, input.title, input.fileName)
          );
        }
      : (input: {
          courseId: string;
          title: string;
          fileName: string;
          contentBase64: string;
          mimeType: string;
        }) => {
          requireAuth();
          return graphqlClient.request(
            ADD_FILE_SOURCE,
            { input },
            authHeaders()
          );
        },
    onSuccess: () => {
      onAdded();
      setSuccess(true);
    },
    onError: (e) => setError(t(getSourceErrorKey(e))),
  });
}
