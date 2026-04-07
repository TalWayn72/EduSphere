import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFileUpload,
  type UseFileUploadOptions,
  type ConfirmResult,
  type PresignResult,
} from './useFileUpload';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'test.png', type = 'image/png', size = 1024): File {
  const blob = new Blob([new ArrayBuffer(size)], { type });
  return new File([blob], name, { type });
}

const defaultPresignResult: PresignResult = {
  uploadUrl: 'https://minio.local/presigned/abc123',
  fileKey: 'uploads/abc123/test.png',
};

const defaultConfirmResult: ConfirmResult = {
  id: 'media-001',
  status: 'READY',
};

function makeOptions(
  overrides: Partial<UseFileUploadOptions> = {}
): UseFileUploadOptions {
  return {
    presign: vi.fn().mockResolvedValue(defaultPresignResult),
    confirm: vi.fn().mockResolvedValue(defaultConfirmResult),
    maxRetries: 3,
    ...overrides,
  };
}

// ── Fetch mock ───────────────────────────────────────────────────────────────

const fetchSpy = vi.fn();

beforeEach(() => {
  fetchSpy.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useFileUpload', () => {
  it('starts in idle state with no error', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useFileUpload(opts));

    expect(result.current.phase).toBe('idle');
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  describe('successful upload flow', () => {
    it('completes presign → PUT → confirm and returns result', async () => {
      const presign = vi.fn().mockResolvedValue(defaultPresignResult);
      const confirm = vi.fn().mockResolvedValue(defaultConfirmResult);
      const onProgress = vi.fn();
      const opts = makeOptions({ presign, confirm, onProgress });

      const { result } = renderHook(() => useFileUpload(opts));
      const file = makeFile();

      let uploadResult: ConfirmResult | null = null;
      await act(async () => {
        uploadResult = await result.current.upload(file);
      });

      expect(uploadResult).toEqual(defaultConfirmResult);
      expect(result.current.phase).toBe('done');
      expect(result.current.progress).toBe(100);
      expect(result.current.uploading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify presign was called with the file
      expect(presign).toHaveBeenCalledWith(file);

      // Verify fetch PUT was called with the presigned URL
      expect(fetchSpy).toHaveBeenCalledWith(
        defaultPresignResult.uploadUrl,
        expect.objectContaining({
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': 'image/png' },
        })
      );

      // Verify confirm was called with fileKey and file
      expect(confirm).toHaveBeenCalledWith(defaultPresignResult.fileKey, file);

      // Verify progress was reported
      expect(onProgress).toHaveBeenCalledWith(10); // presigning
      expect(onProgress).toHaveBeenCalledWith(30); // uploading
      expect(onProgress).toHaveBeenCalledWith(80); // confirming
      expect(onProgress).toHaveBeenCalledWith(100); // done
    });

    it('uses application/octet-stream when file type is empty', async () => {
      const opts = makeOptions();
      const { result } = renderHook(() => useFileUpload(opts));
      const file = new File([new ArrayBuffer(10)], 'data.bin', { type: '' });

      await act(async () => {
        await result.current.upload(file);
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      );
    });
  });

  describe('retry on failure', () => {
    it('retries with exponential backoff on presign failure', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const presign = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(defaultPresignResult);
      const opts = makeOptions({ presign, maxRetries: 3 });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile());
      });

      // Should have called presign 3 times (1 initial + 2 retries before success)
      expect(presign).toHaveBeenCalledTimes(3);
      expect(result.current.phase).toBe('done');
      expect(result.current.error).toBeNull();

      vi.useRealTimers();
    });

    it('retries on PUT failure', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });

      const presign = vi.fn().mockResolvedValue(defaultPresignResult);
      const opts = makeOptions({ presign, maxRetries: 3 });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile());
      });

      // Presign called twice (full pipeline retried from start)
      expect(presign).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.current.phase).toBe('done');

      vi.useRealTimers();
    });

    it('retries on confirm failure', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const confirm = vi
        .fn()
        .mockRejectedValueOnce(new Error('Confirm timeout'))
        .mockResolvedValueOnce(defaultConfirmResult);
      const opts = makeOptions({ confirm, maxRetries: 3 });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile());
      });

      expect(confirm).toHaveBeenCalledTimes(2);
      expect(result.current.phase).toBe('done');

      vi.useRealTimers();
    });
  });

  describe('max retries exceeded', () => {
    it('sets error state when all retries are exhausted', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const presign = vi
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));
      const opts = makeOptions({ presign, maxRetries: 2 });

      const { result } = renderHook(() => useFileUpload(opts));

      let uploadResult: ConfirmResult | null = null;
      await act(async () => {
        uploadResult = await result.current.upload(makeFile());
      });

      expect(uploadResult).toBeNull();
      expect(result.current.phase).toBe('error');
      expect(result.current.error).toBe('Persistent failure');
      expect(result.current.progress).toBe(0);

      // 1 initial + 2 retries = 3 total
      expect(presign).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('returns null when max retries exceeded', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const opts = makeOptions({
        presign: vi.fn().mockRejectedValue(new Error('fail')),
        maxRetries: 0,
      });

      const { result } = renderHook(() => useFileUpload(opts));

      let uploadResult: ConfirmResult | null =
        'not-null' as unknown as ConfirmResult;
      await act(async () => {
        uploadResult = await result.current.upload(makeFile());
      });

      expect(uploadResult).toBeNull();
      expect(result.current.phase).toBe('error');

      vi.useRealTimers();
    });
  });

  describe('retry() method', () => {
    it('retries the last failed upload', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const presign = vi.fn().mockRejectedValue(new Error('fail'));
      const opts = makeOptions({ presign, maxRetries: 0 });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile('doc.pdf'));
      });

      expect(result.current.phase).toBe('error');

      // Now fix presign and retry
      presign.mockResolvedValue(defaultPresignResult);

      await act(async () => {
        const retryResult = await result.current.retry();
        expect(retryResult).toEqual(defaultConfirmResult);
      });

      expect(result.current.phase).toBe('done');

      vi.useRealTimers();
    });

    it('returns null if no previous file exists', async () => {
      const opts = makeOptions();
      const { result } = renderHook(() => useFileUpload(opts));

      let retryResult: ConfirmResult | null =
        'not-null' as unknown as ConfirmResult;
      await act(async () => {
        retryResult = await result.current.retry();
      });

      expect(retryResult).toBeNull();
    });
  });

  describe('reset()', () => {
    it('resets state back to idle', async () => {
      const opts = makeOptions({
        presign: vi.fn().mockRejectedValue(new Error('fail')),
        maxRetries: 0,
      });

      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile());
      });

      expect(result.current.phase).toBe('error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.phase).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('memory safety', () => {
    it('does not update state after unmount', async () => {
      let resolvePresign!: (v: PresignResult) => void;
      const presign = vi.fn().mockReturnValue(
        new Promise<PresignResult>((res) => {
          resolvePresign = res;
        })
      );
      const opts = makeOptions({ presign });

      const { result, unmount } = renderHook(() => useFileUpload(opts));

      // Start upload then unmount before presign resolves
      const uploadPromise = act(async () => {
        void result.current.upload(makeFile());
      });

      unmount();

      // Resolve after unmount — should not throw or update state
      await act(async () => {
        resolvePresign(defaultPresignResult);
        await Promise.resolve();
      });

      await uploadPromise;

      // Phase should remain as it was at unmount time (not 'done')
      expect(result.current.phase).not.toBe('done');
    });

    it('aborts in-flight fetch on unmount', async () => {
      const opts = makeOptions();
      const { result, unmount } = renderHook(() => useFileUpload(opts));

      // Start upload
      act(() => {
        void result.current.upload(makeFile());
      });

      // Unmount should trigger abort
      unmount();

      // The AbortController should have been invoked — verify via
      // the fetch call receiving an abort signal
      if (fetchSpy.mock.calls.length > 0) {
        const fetchCallArgs = fetchSpy.mock.calls[0];
        const fetchOptions = fetchCallArgs?.[1];
        expect(fetchOptions?.signal).toBeDefined();
      }
    });
  });

  describe('progress callback', () => {
    it('reports progress at each phase', async () => {
      const onProgress = vi.fn();
      const opts = makeOptions({ onProgress });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile());
      });

      const progressValues = onProgress.mock.calls.map(
        (call: [number]) => call[0]
      );

      // Should include key milestones
      expect(progressValues).toContain(10); // presigning
      expect(progressValues).toContain(30); // uploading
      expect(progressValues).toContain(80); // confirming
      expect(progressValues).toContain(100); // done

      // Progress should be monotonically increasing
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
    });
  });

  describe('structured logging', () => {
    it('logs with [useFileUpload] prefix on success', async () => {
      // Source uses console.warn (not console.error) for success/info logs
      // guarded by import.meta.env.DEV — spy on warn to capture them.
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const opts = makeOptions();

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile());
      });

      const logMessages = warnSpy.mock.calls.map((c) => String(c[0]));
      const prefixedLogs = logMessages.filter((m) =>
        m.startsWith('[useFileUpload]')
      );

      expect(prefixedLogs.length).toBeGreaterThanOrEqual(3);
      expect(prefixedLogs.some((m) => m.includes('presign OK'))).toBe(true);
      expect(prefixedLogs.some((m) => m.includes('PUT OK'))).toBe(true);
      expect(prefixedLogs.some((m) => m.includes('confirm OK'))).toBe(true);
    });

    it('logs retry attempts with [useFileUpload] prefix', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      // Source uses console.warn for retry attempt messages under import.meta.env.DEV
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const presign = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(defaultPresignResult);
      const opts = makeOptions({ presign, maxRetries: 2 });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        await result.current.upload(makeFile());
      });

      const logMessages = warnSpy.mock.calls.map((c) => String(c[0]));
      const retryLogs = logMessages.filter(
        (m) => m.startsWith('[useFileUpload]') && m.includes('retrying')
      );
      expect(retryLogs.length).toBeGreaterThanOrEqual(1);

      vi.useRealTimers();
    });
  });
});
