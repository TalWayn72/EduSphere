/**
 * useXHRGraphQLUpload — executes a GraphQL mutation via XMLHttpRequest so that
 * the browser's upload.onprogress event fires during the network transfer.
 *
 * Designed for large file mutations (e.g. addFileSource with base64 content)
 * where the payload can be tens of megabytes and we need a real progress bar.
 *
 * Returns a stable `execute` function plus reactive `uploadProgress` (0–100)
 * and `isUploading` state. Memory-safe: no setState after unmount.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface XHRGraphQLUploadOptions {
  /** GraphQL endpoint URL (default: VITE_GRAPHQL_URL or http://localhost:4000/graphql) */
  endpoint?: string;
  /** Additional HTTP request headers (e.g. Authorization) */
  headers?: Record<string, string>;
}

export interface UseXHRGraphQLUploadReturn<TData> {
  /** Send the mutation and return the response data */
  execute: (
    document: DocumentNode,
    variables: Record<string, unknown>
  ) => Promise<TData>;
  /** True while the XHR request is in flight */
  isUploading: boolean;
  /** Upload progress 0–100 (from XHR upload.onprogress) */
  uploadProgress: number;
  /** Abort any in-flight request */
  abort: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useXHRGraphQLUpload<TData = unknown>(
  options: XHRGraphQLUploadOptions = {}
): UseXHRGraphQLUploadReturn<TData> {
  const {
    endpoint = (import.meta.env as Record<string, string>)[
      'VITE_GRAPHQL_URL'
    ] ?? 'http://localhost:4000/graphql',
    headers = {},
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mountedRef = useRef(true);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      xhrRef.current?.abort();
    };
  }, []);

  const abort = useCallback(() => {
    xhrRef.current?.abort();
    if (mountedRef.current) {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const execute = useCallback(
    (
      document: DocumentNode,
      variables: Record<string, unknown>
    ): Promise<TData> => {
      return new Promise<TData>((resolve, reject) => {
        // Abort any previous in-flight request
        xhrRef.current?.abort();

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        if (mountedRef.current) {
          setIsUploading(true);
          setUploadProgress(0);
        }

        // Track upload bytes progress
        xhr.upload.onprogress = (e: ProgressEvent) => {
          if (e.lengthComputable && mountedRef.current) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (mountedRef.current) {
            setIsUploading(false);
            setUploadProgress(100);
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            return;
          }

          let parsed: { data?: TData; errors?: { message: string }[] };
          try {
            parsed = JSON.parse(xhr.responseText) as typeof parsed;
          } catch {
            reject(new Error('Invalid JSON response from GraphQL endpoint'));
            return;
          }

          if (parsed.errors?.length) {
            reject(new Error(parsed.errors[0]?.message ?? 'GraphQL error'));
            return;
          }

          if (parsed.data == null) {
            reject(new Error('GraphQL response contained no data'));
            return;
          }

          resolve(parsed.data);
        };

        xhr.onerror = () => {
          if (mountedRef.current) {
            setIsUploading(false);
            setUploadProgress(0);
          }
          reject(new Error('Network error during file upload'));
        };

        xhr.onabort = () => {
          if (mountedRef.current) {
            setIsUploading(false);
            setUploadProgress(0);
          }
          reject(new DOMException('Aborted', 'AbortError'));
        };

        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Content-Type', 'application/json');
        for (const [key, value] of Object.entries(headers)) {
          xhr.setRequestHeader(key, value);
        }

        const body = JSON.stringify({
          query: print(document),
          variables,
        });

        xhr.send(body);
      });
    },
    [endpoint, headers]
  );

  return { execute, isUploading, uploadProgress, abort };
}
