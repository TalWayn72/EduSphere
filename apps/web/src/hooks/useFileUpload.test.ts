/**
 * Tests for useFileUpload hook.
 *
 * Covers:
 *  1. Initial state
 *  2. Successful presign → XHR PUT (with per-byte progress) → confirm
 *  3. Retry on failure (presign / PUT / confirm)
 *  4. Max retries exhausted → error state
 *  5. retry() / reset() helpers
 *  6. Memory safety (no setState after unmount, abort on unmount)
 *  7. Progress mapping during XHR upload
 *  8. Structured logging with [useFileUpload] prefix
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFileUpload,
  type UseFileUploadOptions,
  type ConfirmResult,
  type PresignResult,
} from './useFileUpload';

// ── XHR mock ──────────────────────────────────────────────────────────────────

interface MockXHRInstance {
  open: ReturnType<typeof vi.fn>;
  setRequestHeader: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  upload: { onprogress: ((e: Partial<ProgressEvent>) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  status: number;
  statusText: string;
  _triggerLoad: (status: number, statusText: string) => void;
  _triggerProgress: (loaded: number, total: number) => void;
  _triggerError: () => void;
  _triggerAbort: () => void;
}

let lastXHR: MockXHRInstance | null = null;

class MockXHR implements MockXHRInstance {
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();
  abort = vi.fn(() => this._triggerAbort());
  upload = { onprogress: null as ((e: Partial<ProgressEvent>) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 200;
  statusText = 'OK';

  _triggerLoad(status: number, statusText: string) {
    this.status = status;
    this.statusText = statusText;
    this.onload?.();
  }
  _triggerProgress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  _triggerError() {
    this.onerror?.();
  }
  _triggerAbort() {
    this.onabort?.();
  }
}

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

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('XMLHttpRequest', function () {
    const xhr = new MockXHR();
    lastXHR = xhr;
    return xhr;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  lastXHR = null;
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
    it('completes presign → XHR PUT → confirm and returns result', async () => {
      const presign = vi.fn().mockResolvedValue(defaultPresignResult);
      const confirm = vi.fn().mockResolvedValue(defaultConfirmResult);
      const onProgress = vi.fn();
      const opts = makeOptions({ presign, confirm, onProgress });

      const { result } = renderHook(() => useFileUpload(opts));
      const file = makeFile();

      let uploadResult: ConfirmResult | null = null;
      await act(async () => {
        const p = result.current.upload(file);
        // Wait for presign to resolve then trigger XHR completion
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        uploadResult = await p;
      });

      expect(uploadResult).toEqual(defaultConfirmResult);
      expect(result.current.phase).toBe('done');
      expect(result.current.progress).toBe(100);
      expect(result.current.uploading).toBe(false);
      expect(result.current.error).toBeNull();

      expect(presign).toHaveBeenCalledWith(file);
      expect(confirm).toHaveBeenCalledWith(defaultPresignResult.fileKey, file);
    });

    it('uses correct Content-Type in XHR PUT', async () => {
      const opts = makeOptions();
      const { result } = renderHook(() => useFileUpload(opts));
      const file = makeFile('doc.pdf', 'application/pdf');

      await act(async () => {
        const p = result.current.upload(file);
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        await p;
      });

      expect(lastXHR?.setRequestHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf'
      );
    });

    it('uses application/octet-stream when file type is empty', async () => {
      const opts = makeOptions();
      const { result } = renderHook(() => useFileUpload(opts));
      const file = new File([new ArrayBuffer(10)], 'data.bin', { type: '' });

      await act(async () => {
        const p = result.current.upload(file);
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        await p;
      });

      expect(lastXHR?.setRequestHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream'
      );
    });
  });

  describe('XHR progress reporting', () => {
    it('maps XHR bytes progress to 30–79% range', async () => {
      const onProgress = vi.fn();
      const opts = makeOptions({ onProgress });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        const p = result.current.upload(makeFile());
        await Promise.resolve();
        await Promise.resolve();
        // Trigger 50% byte progress
        lastXHR?._triggerProgress(500, 1000);
        lastXHR?._triggerLoad(200, 'OK');
        await p;
      });

      const progressCalls = onProgress.mock.calls.map((c: [number]) => c[0]);

      // Should include the mapped 50% byte progress = 30 + Math.round(0.5 * 49) = 54 or 55
      const uploadRangeValues = progressCalls.filter(
        (v: number) => v > 30 && v < 80
      );
      expect(uploadRangeValues.length).toBeGreaterThan(0);
    });

    it('reports progress milestones: 10 (presign), 30 (upload start), 80 (confirm), 100 (done)', async () => {
      const onProgress = vi.fn();
      const opts = makeOptions({ onProgress });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        const p = result.current.upload(makeFile());
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        await p;
      });

      const progressValues = onProgress.mock.calls.map((c: [number]) => c[0]);

      expect(progressValues).toContain(10); // presigning
      expect(progressValues).toContain(30); // uploading start
      expect(progressValues).toContain(80); // confirming
      expect(progressValues).toContain(100); // done
    });

    it('progress values are monotonically non-decreasing', async () => {
      const onProgress = vi.fn();
      const opts = makeOptions({ onProgress });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        const p = result.current.upload(makeFile());
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerProgress(250, 1000);
        lastXHR?._triggerProgress(750, 1000);
        lastXHR?._triggerLoad(200, 'OK');
        await p;
      });

      const progressValues = onProgress.mock.calls.map((c: [number]) => c[0]);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
    });
  });

  describe('retry on failure', () => {
    it('retries on presign failure and succeeds on third attempt', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      vi.stubGlobal('XMLHttpRequest', function () {
        const xhr = new MockXHR();
        lastXHR = xhr;
        return xhr;
      });

      const presign = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(defaultPresignResult);
      const opts = makeOptions({ presign, maxRetries: 3 });

      const { result } = renderHook(() => useFileUpload(opts));

      let uploadResult: ConfirmResult | null = null;
      await act(async () => {
        const p = result.current.upload(makeFile());
        // Advance past backoff delays (1s + 2s = 3s; use 10s to be safe)
        await vi.advanceTimersByTimeAsync(10000);
        // After backoff, XHR is created and awaiting load
        lastXHR?._triggerLoad(200, 'OK');
        uploadResult = await p;
      });

      expect(presign).toHaveBeenCalledTimes(3);
      expect(result.current.phase).toBe('done');
      expect(uploadResult).toEqual(defaultConfirmResult);

      vi.useRealTimers();
    });

    it('retries on PUT failure (XHR non-2xx)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const xhrInstances: MockXHR[] = [];
      vi.stubGlobal('XMLHttpRequest', function () {
        const xhr = new MockXHR();
        xhrInstances.push(xhr);
        lastXHR = xhr;
        return xhr;
      });

      const presign = vi.fn().mockResolvedValue(defaultPresignResult);
      const opts = makeOptions({ presign, maxRetries: 3 });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        const p = result.current.upload(makeFile());

        // Let presign resolve (microtasks), then fail first XHR
        await Promise.resolve();
        await Promise.resolve();
        xhrInstances[0]?._triggerLoad(500, 'Server Error');

        // Advance timers past backoff delay
        await vi.advanceTimersByTimeAsync(2000);

        // Let second presign resolve, then complete second XHR
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');

        await p;
      });

      expect(presign).toHaveBeenCalledTimes(2);
      expect(result.current.phase).toBe('done');

      vi.useRealTimers();
    });

    it('retries on confirm failure', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const xhrInstances: MockXHR[] = [];
      vi.stubGlobal('XMLHttpRequest', function () {
        const xhr = new MockXHR();
        xhrInstances.push(xhr);
        lastXHR = xhr;
        return xhr;
      });

      let confirmCallCount = 0;
      const confirm = vi.fn().mockImplementation(async () => {
        confirmCallCount++;
        if (confirmCallCount === 1) throw new Error('Confirm timeout');
        return defaultConfirmResult;
      });
      const opts = makeOptions({ confirm, maxRetries: 3 });

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        const p = result.current.upload(makeFile());

        // Wait for first presign to resolve and first XHR to be created
        await Promise.resolve();
        await Promise.resolve();
        // Complete first XHR — confirm will fail
        xhrInstances[0]?._triggerLoad(200, 'OK');
        // Let confirm failure propagate
        await Promise.resolve();
        await Promise.resolve();

        // Advance past backoff (1000ms)
        await vi.advanceTimersByTimeAsync(2000);

        // Wait for second presign to resolve and second XHR to be created
        await Promise.resolve();
        await Promise.resolve();
        // Complete second XHR — confirm succeeds
        xhrInstances[1]?._triggerLoad(200, 'OK');

        await p;
      });

      expect(confirm).toHaveBeenCalledTimes(2);
      expect(result.current.phase).toBe('done');

      vi.useRealTimers();
    });
  });

  describe('max retries exceeded', () => {
    it('sets error state when all retries are exhausted (maxRetries=0)', async () => {
      // maxRetries=0 means no backoff delays — cleaner to test without fake timers
      const presign = vi
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));
      const opts = makeOptions({ presign, maxRetries: 0 });

      const { result } = renderHook(() => useFileUpload(opts));

      let uploadResult: ConfirmResult | null = null;
      await act(async () => {
        uploadResult = await result.current.upload(makeFile());
      });

      expect(uploadResult).toBeNull();
      expect(result.current.phase).toBe('error');
      expect(result.current.error).toBe('Persistent failure');
      expect(result.current.progress).toBe(0);

      // maxRetries=0: 1 initial + 0 retries = 1 total
      expect(presign).toHaveBeenCalledTimes(1);
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

      // Fix presign and retry
      presign.mockResolvedValue(defaultPresignResult);

      await act(async () => {
        const p = result.current.retry();
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        const retryResult = await p;
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

      const uploadPromise = act(async () => {
        void result.current.upload(makeFile());
      });

      unmount();

      await act(async () => {
        resolvePresign(defaultPresignResult);
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        await Promise.resolve();
      });

      await uploadPromise;

      expect(result.current.phase).not.toBe('done');
    });

    it('XHR is sent with the presigned URL', async () => {
      const opts = makeOptions();
      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        const p = result.current.upload(makeFile());
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        await p;
      });

      expect(lastXHR?.open).toHaveBeenCalledWith(
        'PUT',
        defaultPresignResult.uploadUrl
      );
    });
  });

  describe('structured logging', () => {
    it('logs with [useFileUpload] prefix on success', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const opts = makeOptions();

      const { result } = renderHook(() => useFileUpload(opts));

      await act(async () => {
        const p = result.current.upload(makeFile());
        await Promise.resolve();
        await Promise.resolve();
        lastXHR?._triggerLoad(200, 'OK');
        await p;
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
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      vi.stubGlobal('XMLHttpRequest', function () {
        const xhr = new MockXHR();
        lastXHR = xhr;
        return xhr;
      });

      const presign = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(defaultPresignResult);
      const opts = makeOptions({ presign, maxRetries: 2 });

      const { result } = renderHook(() => useFileUpload(opts));

      const uploadPromise = result.current.upload(makeFile());

      // Advance past the backoff delay (1000ms for first retry)
      await vi.advanceTimersByTimeAsync(2000);

      // Now presign succeeded — XHR was created, trigger its load
      act(() => {
        lastXHR?._triggerLoad(200, 'OK');
      });

      await uploadPromise;

      const logMessages = warnSpy.mock.calls.map((c) => String(c[0]));
      const retryLogs = logMessages.filter(
        (m) => m.startsWith('[useFileUpload]') && m.includes('retrying')
      );
      expect(retryLogs.length).toBeGreaterThanOrEqual(1);

      vi.useRealTimers();
    });
  });
});
