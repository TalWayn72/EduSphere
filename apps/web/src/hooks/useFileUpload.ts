/**
 * useFileUpload — shared hook that consolidates the presign → upload → confirm
 * flow used across AssetUploader, CourseWizardMediaStep, and other upload surfaces.
 *
 * Features:
 * - Presign URL → XHR PUT to presigned URL (real per-byte progress) → confirm
 * - XHR upload.onprogress maps to 30–80% of overall pipeline progress
 * - Retry with exponential backoff (1s, 2s, 4s by default)
 * - Progress callback for UI feedback
 * - Structured logging with [useFileUpload] prefix
 * - Memory-safe: aborts in-flight XHR on unmount
 */
import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PresignResult {
  uploadUrl: string;
  fileKey: string;
}

export interface ConfirmResult {
  id: string;
  [key: string]: unknown;
}

export interface UseFileUploadOptions {
  /** Max retry attempts on transient failure (default: 3) */
  maxRetries?: number;
  /** Progress callback — receives a value 0..100 */
  onProgress?: (pct: number) => void;
  /** Obtain a presigned upload URL for the given file */
  presign: (file: File) => Promise<PresignResult>;
  /** Confirm the upload after the file has been PUT */
  confirm: (fileKey: string, file: File) => Promise<ConfirmResult>;
}

export type UploadPhase =
  | 'idle'
  | 'presigning'
  | 'uploading'
  | 'confirming'
  | 'done'
  | 'error';

export interface UseFileUploadReturn {
  /** Initiate the presign → PUT → confirm pipeline for a file */
  upload: (file: File) => Promise<ConfirmResult | null>;
  /** True while any phase is in progress */
  uploading: boolean;
  /** Current phase of the pipeline */
  phase: UploadPhase;
  /** Human-readable error message (null when no error) */
  error: string | null;
  /** Upload progress 0..100 (XHR-accurate during uploading phase) */
  progress: number;
  /** Retry the last failed upload */
  retry: () => Promise<ConfirmResult | null>;
  /** Reset state back to idle */
  reset: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_DELAY_MS = 1_000;
const LOG_PREFIX = '[useFileUpload]';

/** Overall progress boundaries for each phase */
const PHASE_START = { presigning: 0, uploading: 30, confirming: 80 } as const;
const PHASE_END = { uploading: 79 } as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/**
 * PUT a file to a presigned URL via XHR so we get granular upload.onprogress
 * events. Resolves with HTTP status on success, rejects on network error or
 * non-2xx status. Aborts when `signal` fires.
 */
function xhrPut(
  url: string,
  file: File,
  signal: AbortSignal,
  onProgress: (loaded: number, total: number) => void
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.status);
      } else {
        reject(new Error(`PUT failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('PUT network error'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));

    signal.addEventListener('abort', () => xhr.abort());

    xhr.open('PUT', url);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream'
    );
    xhr.send(file);
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFileUpload(
  options: UseFileUploadOptions
): UseFileUploadReturn {
  const { maxRetries = 3, onProgress, presign, confirm } = options;

  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const lastFileRef = useRef<File | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Memory safety: track mount state and abort in-flight work on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const reportProgress = useCallback(
    (pct: number) => {
      if (!mountedRef.current) return;
      setProgress(pct);
      onProgress?.(pct);
    },
    [onProgress]
  );

  const executeUpload = useCallback(
    async (file: File): Promise<ConfirmResult | null> => {
      // Abort any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      lastFileRef.current = file;
      setError(null);
      setPhase('presigning');
      reportProgress(0);

      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          if (controller.signal.aborted) return null;

          // ── Step 1: Presign ────────────────────────────────────────
          if (mountedRef.current) setPhase('presigning');
          reportProgress(PHASE_START.presigning + 10);

          const { uploadUrl, fileKey } = await presign(file);

          if (import.meta.env.DEV)
            console.warn(`${LOG_PREFIX} presign OK — fileKey=${fileKey}`);

          if (!mountedRef.current) return null;

          // ── Step 2: XHR PUT with real per-byte progress ────────────
          setPhase('uploading');
          reportProgress(PHASE_START.uploading);

          await xhrPut(
            uploadUrl,
            file,
            controller.signal,
            (loaded: number, total: number) => {
              if (!mountedRef.current) return;
              // Map 0..total bytes → 30..79% of overall progress
              const range = PHASE_END.uploading - PHASE_START.uploading;
              const pct =
                PHASE_START.uploading + Math.round((loaded / total) * range);
              reportProgress(pct);
            }
          );

          if (import.meta.env.DEV) console.warn(`${LOG_PREFIX} PUT OK`);
          if (!mountedRef.current) return null;

          // ── Step 3: Confirm ────────────────────────────────────────
          setPhase('confirming');
          reportProgress(PHASE_START.confirming);

          const result = await confirm(fileKey, file);

          if (import.meta.env.DEV)
            console.warn(`${LOG_PREFIX} confirm OK — id=${result.id}`);

          if (!mountedRef.current) return null;

          setPhase('done');
          reportProgress(100);
          return result;
        } catch (err: unknown) {
          // Abort errors are not retryable
          if (err instanceof DOMException && err.name === 'AbortError') {
            if (import.meta.env.DEV) console.warn(`${LOG_PREFIX} aborted`);
            return null;
          }

          const message = err instanceof Error ? err.message : String(err);
          attempt += 1;

          if (attempt > maxRetries) {
            console.error(
              `${LOG_PREFIX} all ${maxRetries} retries exhausted — ${message}`
            );
            if (mountedRef.current) {
              setPhase('error');
              setError(message);
              reportProgress(0);
            }
            return null;
          }

          const backoffMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          if (import.meta.env.DEV) {
            console.warn(
              `${LOG_PREFIX} attempt ${attempt}/${maxRetries} failed (${message}) — retrying in ${backoffMs}ms`
            );
          }

          try {
            await delay(backoffMs, controller.signal);
          } catch {
            // Aborted during backoff
            return null;
          }
        }
      }

      return null;
    },
    [maxRetries, presign, confirm, reportProgress]
  );

  const retry = useCallback(async (): Promise<ConfirmResult | null> => {
    const file = lastFileRef.current;
    if (!file) {
      if (import.meta.env.DEV)
        console.warn(`${LOG_PREFIX} retry called with no previous file`);
      return null;
    }
    return executeUpload(file);
  }, [executeUpload]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setError(null);
    setProgress(0);
  }, []);

  const uploading =
    phase === 'presigning' || phase === 'uploading' || phase === 'confirming';

  return {
    upload: executeUpload,
    uploading,
    phase,
    error,
    progress,
    retry,
    reset,
  };
}
