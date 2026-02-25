/**
 * SCORM 1.2 API Shim — injected as window.API in SCORM content iframes.
 *
 * Communicates with the parent EduSphere window via postMessage.
 * The parent frame listens for SCORM_SET / SCORM_COMMIT / SCORM_FINISH
 * and persists state via GraphQL mutations.
 */

const PARENT_ORIGIN = window.location.origin;

export class SCORM12API {
  private readonly sessionId: string;
  private data: Record<string, string> = {};
  private initialized = false;
  private commitTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  LMSInitialize(_: string): string {
    this.initialized = true;
    return 'true';
  }

  LMSSetValue(element: string, value: string): string {
    if (!this.initialized) return 'false';
    this.data[element] = value;
    // Debounce: batch rapid sets into a single postMessage
    if (this.commitTimer !== null) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => {
      window.parent.postMessage(
        { type: 'SCORM_SET', element, value, sessionId: this.sessionId },
        PARENT_ORIGIN,
      );
      this.commitTimer = null;
    }, 300);
    return 'true';
  }

  LMSGetValue(element: string): string {
    return this.data[element] ?? '';
  }

  LMSCommit(_: string): string {
    if (this.commitTimer !== null) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    window.parent.postMessage(
      { type: 'SCORM_COMMIT', data: { ...this.data }, sessionId: this.sessionId },
      PARENT_ORIGIN,
    );
    return 'true';
  }

  LMSFinish(_: string): string {
    if (this.commitTimer !== null) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    window.parent.postMessage(
      { type: 'SCORM_FINISH', data: { ...this.data }, sessionId: this.sessionId },
      PARENT_ORIGIN,
    );
    return 'true';
  }

  LMSGetLastError(): string {
    return '0';
  }
  LMSGetErrorString(_: string): string {
    return 'No error';
  }
  LMSGetDiagnostic(_: string): string {
    return '';
  }

  /** Cleanup — called when component unmounts to prevent timer leaks */
  destroy(): void {
    if (this.commitTimer !== null) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
  }
}
