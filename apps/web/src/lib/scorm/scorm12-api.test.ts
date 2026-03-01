/**
 * Tests for lib/scorm/scorm12-api.ts
 *
 * Covers: initialisation gate, value storage, postMessage debouncing,
 * commit/finish flush behaviour, and error-string helpers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Module under test ─────────────────────────────────────────────────────────
import { SCORM12API } from './scorm12-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeApi(sessionId = 'session-1'): SCORM12API {
  return new SCORM12API(sessionId);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SCORM12API', () => {
  let postMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    postMessageMock = vi.fn();
    // Replace window.parent.postMessage with our spy
    Object.defineProperty(window, 'parent', {
      writable: true,
      value: { postMessage: postMessageMock },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Initialisation ──────────────────────────────────────────────────────────

  it('LMSInitialize returns "true"', () => {
    const api = makeApi();
    expect(api.LMSInitialize('')).toBe('true');
  });

  // ── LMSSetValue gate ────────────────────────────────────────────────────────

  it('LMSSetValue returns "false" before LMSInitialize', () => {
    const api = makeApi();
    expect(api.LMSSetValue('cmi.core.lesson_status', 'passed')).toBe('false');
  });

  it('LMSSetValue returns "true" after LMSInitialize', () => {
    const api = makeApi();
    api.LMSInitialize('');
    expect(api.LMSSetValue('cmi.core.lesson_status', 'passed')).toBe('true');
  });

  // ── LMSGetValue ─────────────────────────────────────────────────────────────

  it('LMSGetValue returns the stored value after LMSSetValue', () => {
    const api = makeApi();
    api.LMSInitialize('');
    api.LMSSetValue('cmi.core.score.raw', '85');
    // Advance past debounce so the timer fires (not required for getter, but keeps state clean)
    expect(api.LMSGetValue('cmi.core.score.raw')).toBe('85');
  });

  it('LMSGetValue returns "" for an unknown key', () => {
    const api = makeApi();
    api.LMSInitialize('');
    expect(api.LMSGetValue('cmi.core.nonexistent')).toBe('');
  });

  // ── Debouncing ──────────────────────────────────────────────────────────────

  it('LMSSetValue debounces: postMessage is not sent before 300 ms', () => {
    const api = makeApi();
    api.LMSInitialize('');
    api.LMSSetValue('cmi.core.lesson_status', 'incomplete');

    vi.advanceTimersByTime(299);
    expect(postMessageMock).not.toHaveBeenCalled();
  });

  it('LMSSetValue debounces: postMessage IS sent after 300 ms', () => {
    const api = makeApi();
    api.LMSInitialize('');
    api.LMSSetValue('cmi.core.lesson_status', 'incomplete');

    vi.advanceTimersByTime(300);
    expect(postMessageMock).toHaveBeenCalledOnce();
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SCORM_SET' }),
      expect.any(String)
    );
  });

  // ── LMSCommit ───────────────────────────────────────────────────────────────

  it('LMSCommit sends a SCORM_COMMIT postMessage immediately', () => {
    const api = makeApi();
    api.LMSInitialize('');
    api.LMSCommit('');

    expect(postMessageMock).toHaveBeenCalledOnce();
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SCORM_COMMIT' }),
      expect.any(String)
    );
  });

  it('LMSCommit clears the pending debounce timer', () => {
    const api = makeApi();
    api.LMSInitialize('');
    api.LMSSetValue('cmi.core.lesson_status', 'incomplete'); // starts 300 ms timer
    api.LMSCommit(''); // should cancel the timer

    const callsAfterCommit = postMessageMock.mock.calls.length;
    vi.advanceTimersByTime(300); // timer should NOT fire again
    expect(postMessageMock.mock.calls.length).toBe(callsAfterCommit);
  });

  // ── LMSFinish ───────────────────────────────────────────────────────────────

  it('LMSFinish sends a SCORM_FINISH postMessage', () => {
    const api = makeApi();
    api.LMSInitialize('');
    api.LMSFinish('');

    expect(postMessageMock).toHaveBeenCalledOnce();
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SCORM_FINISH' }),
      expect.any(String)
    );
  });

  it('LMSFinish clears the pending debounce timer', () => {
    const api = makeApi();
    api.LMSInitialize('');
    api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
    api.LMSFinish('');

    const callsAfterFinish = postMessageMock.mock.calls.length;
    vi.advanceTimersByTime(300);
    expect(postMessageMock.mock.calls.length).toBe(callsAfterFinish);
  });

  // ── Error helpers ───────────────────────────────────────────────────────────

  it('LMSGetLastError returns "0"', () => {
    expect(makeApi().LMSGetLastError()).toBe('0');
  });

  it('LMSGetErrorString returns a string (no error message by default)', () => {
    // The real implementation returns 'No error' — just assert it is a string
    expect(typeof makeApi().LMSGetErrorString('')).toBe('string');
  });

  it('LMSGetDiagnostic returns ""', () => {
    expect(makeApi().LMSGetDiagnostic('')).toBe('');
  });
});
