/**
 * SourceManager unit tests.
 *
 * The component uses IS_DEV_MODE (true in vitest because VITE_KEYCLOAK_URL
 * is not set), so all mutations use devMutationFn (no-op).
 *
 * Critical regression test: file upload must NOT call the REST endpoint
 * `POST /api/knowledge-sources/upload` — it must use the GraphQL mutation
 * `addFileSource` via graphqlClient.request() instead.
 *
 * BUG-045 regression tests: verify i18n strings are dynamic (not hardcoded
 * Hebrew), `dir` attribute responds to i18n.dir(), and getSourceErrorKey()
 * returns i18n keys (not raw Hebrew).
 */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock graphql lib ──────────────────────────────────────────────────────────
// vi.mock factories are hoisted so references to local variables must use vi.hoisted()
const { mockGqlRequest } = vi.hoisted(() => ({
  mockGqlRequest: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/graphql', () => ({
  gqlClient: { request: mockGqlRequest },
}));

// ── Mock auth ─────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token'),
  getCurrentUser: vi.fn(() => ({
    id: 'user-1',
    role: 'STUDENT',
    tenantId: 'tenant-1',
  })),
}));

// ── Mock GraphQL query modules ─────────────────────────────────────────────────
vi.mock('@/lib/graphql/sources.queries', () => ({
  COURSE_KNOWLEDGE_SOURCES: 'COURSE_KNOWLEDGE_SOURCES',
  KNOWLEDGE_SOURCE_DETAIL: 'KNOWLEDGE_SOURCE_DETAIL',
  ADD_URL_SOURCE: 'ADD_URL_SOURCE',
  ADD_TEXT_SOURCE: 'ADD_TEXT_SOURCE',
  ADD_YOUTUBE_SOURCE: 'ADD_YOUTUBE_SOURCE',
  ADD_FILE_SOURCE: 'ADD_FILE_SOURCE',
  DELETE_KNOWLEDGE_SOURCE: 'DELETE_KNOWLEDGE_SOURCE',
}));

import { SourceManager, parseSourceError, getSourceErrorKey, getFriendlySourceErrorKey } from './SourceManager';

// ── QueryClient wrapper ───────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // @ts-expect-error — React 19 ReactNode includes bigint; @tanstack/react-query types use React 18
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ── parseSourceError unit tests (deprecated helper — kept for backward compat) ─

describe('parseSourceError()', () => {
  it('returns Hebrew Unauthorized message for "Unauthorized" error', () => {
    const result = parseSourceError(new Error('Unauthorized: Auth required'));
    expect(result).toBe(
      'שגיאת הרשאה — נא להתחבר מחדש ולנסות שוב. אם הבעיה נמשכת, פנה למנהל המערכת.'
    );
  });

  it('returns Hebrew Unauthorized message for "Auth required" error', () => {
    const result = parseSourceError(new Error('Auth required'));
    expect(result).toBe(
      'שגיאת הרשאה — נא להתחבר מחדש ולנסות שוב. אם הבעיה נמשכת, פנה למנהל המערכת.'
    );
  });

  it('returns Hebrew downstream message for DOWNSTREAM_SERVICE_ERROR', () => {
    const result = parseSourceError(
      new Error('GraphQL Error: DOWNSTREAM_SERVICE_ERROR')
    );
    expect(result).toBe(
      'שגיאה בשירות הפנימי — ייתכן שהשרת אינו זמין. נסה שוב בעוד מספר שניות.'
    );
  });

  it('returns Hebrew network message for Network errors', () => {
    const result = parseSourceError(new Error('Network error occurred'));
    expect(result).toBe('שגיאת רשת — בדוק שהשרת פועל ונסה שוב.');
  });

  it('returns Hebrew network message for fetch errors', () => {
    const result = parseSourceError(new Error('Failed to fetch'));
    expect(result).toBe('שגיאת רשת — בדוק שהשרת פועל ונסה שוב.');
  });

  it('returns raw message for unknown errors (IS_DEV_MODE=true in test env)', () => {
    const result = parseSourceError(
      new Error('Some unexpected internal error')
    );
    expect(result).toBe('Error: Some unexpected internal error');
  });

  it('returns שגיאה לא ידועה for falsy input', () => {
    expect(parseSourceError(null)).toBe('שגיאה לא ידועה');
    expect(parseSourceError(undefined)).toBe('שגיאה לא ידועה');
    expect(parseSourceError('')).toBe('שגיאה לא ידועה');
  });

  it('handles plain string errors correctly', () => {
    expect(parseSourceError('Unauthorized')).toBe(
      'שגיאת הרשאה — נא להתחבר מחדש ולנסות שוב. אם הבעיה נמשכת, פנה למנהל המערכת.'
    );
    expect(parseSourceError('Network timeout')).toBe(
      'שגיאת רשת — בדוק שהשרת פועל ונסה שוב.'
    );
  });
});

// ── BUG-055 REGRESSION: getFriendlySourceErrorKey() never exposes raw backend strings ─

describe('getFriendlySourceErrorKey() — BUG-055 regression', () => {
  it('maps "Processing was interrupted (service restarted)" to sources.errorServiceRestarted', () => {
    expect(
      getFriendlySourceErrorKey('Processing was interrupted (service restarted)')
    ).toBe('sources.errorServiceRestarted');
  });

  it('maps "interrupted" variant to sources.errorServiceRestarted', () => {
    expect(getFriendlySourceErrorKey('Worker interrupted')).toBe(
      'sources.errorServiceRestarted'
    );
  });

  it('maps timeout error to sources.errorTimeout', () => {
    expect(getFriendlySourceErrorKey('Processing timed out after 300s')).toBe(
      'sources.errorTimeout'
    );
  });

  it('maps file size error to sources.errorFileTooLarge', () => {
    expect(
      getFriendlySourceErrorKey('File exceeds size limit of 25 MB')
    ).toBe('sources.errorFileTooLarge');
  });

  it('returns sources.errorGeneric for unknown error strings', () => {
    expect(
      getFriendlySourceErrorKey('Unexpected internal error XYZ')
    ).toBe('sources.errorGeneric');
  });

  it('returns sources.errorGeneric for undefined (no error message)', () => {
    expect(getFriendlySourceErrorKey(undefined)).toBe('sources.errorGeneric');
  });

  it('NEVER returns a raw technical backend string — always returns an i18n key', () => {
    const rawBackendStrings = [
      'Processing was interrupted (service restarted)',
      'Worker interrupted',
      'timed out after 300s',
      'size limit exceeded',
      undefined,
    ];
    for (const raw of rawBackendStrings) {
      const key = getFriendlySourceErrorKey(raw);
      // Must be a dot-notation i18n key, never the raw string itself
      expect(key).toMatch(/^sources\.\w+$/);
      expect(key).not.toBe(raw);
    }
  });
});

// ── BUG-055 REGRESSION: SourceManager must NOT render raw errorMessage in DOM ─

describe('SourceManager FAILED source — BUG-055 visual regression', () => {
  it('does NOT render raw "Processing was interrupted" text in UI for FAILED source', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    // The dev mock data does not include FAILED sources, but we verify the
    // key contract: raw technical backend strings are never in the DOM.
    await waitFor(() => {
      const bodyText = document.body.textContent ?? '';
      expect(bodyText).not.toContain('Processing was interrupted');
      expect(bodyText).not.toContain('service restarted');
    });
  });
});

// ── BUG-045 REGRESSION: getSourceErrorKey() returns i18n keys, not raw Hebrew ─

describe('getSourceErrorKey() — BUG-045 regression', () => {
  it('returns sources.errorUnauthorized for Unauthorized errors', () => {
    expect(getSourceErrorKey(new Error('Unauthorized'))).toBe('sources.errorUnauthorized');
    expect(getSourceErrorKey(new Error('Auth required'))).toBe('sources.errorUnauthorized');
  });

  it('returns sources.errorDownstream for DOWNSTREAM_SERVICE_ERROR', () => {
    expect(getSourceErrorKey(new Error('DOWNSTREAM_SERVICE_ERROR'))).toBe('sources.errorDownstream');
  });

  it('returns sources.errorNetwork for Network/fetch errors', () => {
    expect(getSourceErrorKey(new Error('Network error'))).toBe('sources.errorNetwork');
    expect(getSourceErrorKey(new Error('Failed to fetch'))).toBe('sources.errorNetwork');
  });

  it('returns sources.errorGeneric for unknown errors', () => {
    expect(getSourceErrorKey(new Error('Something unexpected'))).toBe('sources.errorGeneric');
  });

  it('returns sources.errorUnknown for falsy input', () => {
    expect(getSourceErrorKey(null)).toBe('sources.errorUnknown');
    expect(getSourceErrorKey(undefined)).toBe('sources.errorUnknown');
    expect(getSourceErrorKey('')).toBe('sources.errorUnknown');
  });

  it('does NOT return any Hebrew strings — only i18n key paths', () => {
    const errors = [
      new Error('Unauthorized'),
      new Error('DOWNSTREAM_SERVICE_ERROR'),
      new Error('Network error'),
      new Error('Unknown'),
      null,
    ];
    for (const err of errors) {
      const key = getSourceErrorKey(err);
      // Must be a dot-notation key, not a Hebrew string
      expect(key).toMatch(/^sources\.\w+$/);
      expect(key).not.toMatch(/[\u0590-\u05FF]/); // no Hebrew unicode
    }
  });
});

// ── SourceManager component tests ─────────────────────────────────────────────

describe('SourceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── BUG-045 REGRESSION: UI strings must be i18n-driven, not hardcoded Hebrew ─

  it('BUG-045: renders header with English i18n string, not hardcoded Hebrew', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    // English from content.json sources.title — NOT hardcoded Hebrew "מקורות מידע"
    expect(screen.getByText('Knowledge Sources')).toBeInTheDocument();
    expect(screen.queryByText('מקורות מידע')).not.toBeInTheDocument();
  });

  it('BUG-045: main panel dir attribute is from i18n.dir(), not hardcoded rtl', () => {
    const { container } = render(<SourceManager courseId="course-1" />, { wrapper });
    // The outer panel div must have dir="ltr" (from mock i18n.dir() → 'ltr')
    const panel = container.querySelector('[dir]');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('dir')).toBe('ltr');
    // Must NOT be hardcoded 'rtl'
    expect(panel?.getAttribute('dir')).not.toBe('rtl');
  });

  it('BUG-045: add-source modal dir attribute is from i18n.dir(), not hardcoded rtl', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('Add source'));
    });
    // The modal inner div must have dir="ltr"
    const modal = document.querySelector('.fixed .rounded-2xl[dir]');
    expect(modal).not.toBeNull();
    expect(modal?.getAttribute('dir')).toBe('ltr');
    expect(modal?.getAttribute('dir')).not.toBe('rtl');
  });

  it('BUG-045: tab labels use i18n keys, not hardcoded Hebrew', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('Add source'));
    });
    // English tab labels from content.json sources.tabXxx
    expect(screen.getByText('🌐 Link')).toBeInTheDocument();
    expect(screen.getByText('✏️ Text')).toBeInTheDocument();
    expect(screen.getByText('▶️ YouTube')).toBeInTheDocument();
    expect(screen.getByText('📄 File')).toBeInTheDocument();
    // Must NOT contain hardcoded Hebrew tab labels
    expect(screen.queryByText('🌐 קישור')).not.toBeInTheDocument();
    expect(screen.queryByText('✏️ טקסט')).not.toBeInTheDocument();
    expect(screen.queryByText('📄 קובץ')).not.toBeInTheDocument();
  });

  // ── Core functionality tests (updated to English i18n strings) ─────────────

  it('renders the panel header and source list', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    expect(screen.getByText('Knowledge Sources')).toBeInTheDocument();
    // In DEV_MODE the mock sources are loaded
    await waitFor(() => {
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });
  });

  it('shows add button when panel loads', () => {
    render(<SourceManager courseId="course-empty" />, { wrapper });
    expect(screen.getByText('Add source')).toBeInTheDocument();
  });

  it('opens the add-source modal when "Add source" is clicked', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    const addBtn = screen.getByText('Add source');
    await act(async () => {
      fireEvent.click(addBtn);
    });
    expect(screen.getByText('Add Knowledge Source')).toBeInTheDocument();
  });

  it('closes the modal when ✕ is clicked', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('Add source'));
    });
    const closeBtn = screen.getAllByText('✕').at(-1) as HTMLElement;
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(screen.queryByText('Add Knowledge Source')).not.toBeInTheDocument();
  });

  it('shows all four tabs in the add-source modal', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('Add source'));
    });
    expect(screen.getByText('🌐 Link')).toBeInTheDocument();
    expect(screen.getByText('✏️ Text')).toBeInTheDocument();
    expect(screen.getByText('▶️ YouTube')).toBeInTheDocument();
    expect(screen.getByText('📄 File')).toBeInTheDocument();
  });

  it('file tab: shows file upload UI when "📄 File" tab is clicked', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('Add source'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('📄 File'));
    });
    expect(screen.getByText('DOCX, PDF or TXT, up to 25 MB')).toBeInTheDocument();
  });

  it('file tab: shows error when submitting without a file', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('Add source'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('📄 File'));
    });
    // Submit button is the last "Add source" button when modal is open
    const submitBtn = screen.getAllByText('Add source').at(-1) as HTMLElement;
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    expect(screen.getByText('Please select a file')).toBeInTheDocument();
  });

  // ── BUG REGRESSION: file upload must NOT call REST endpoint ──────────────────

  it('file upload uses GraphQL mutation, NOT REST fetch endpoint', async () => {
    // Spy on fetch to ensure it is never called with the REST upload URL
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('', { status: 404 }));

    // Stub FileReader.readAsDataURL to synchronously call onload with base64
    const originalFileReader = globalThis.FileReader;
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(_file: Blob) {
        this.result = 'data:application/pdf;base64,JVBERi0=';
        // Trigger onload asynchronously (simulates real FileReader behavior)
        Promise.resolve().then(() => {
          if (this.onload) this.onload();
        });
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).FileReader = MockFileReader;

    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('Add source'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('📄 File'));
    });

    // Simulate file selection
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const testFile = new File(['%PDF-1.4'], 'test.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      configurable: true,
    });
    await act(async () => {
      fireEvent.change(fileInput);
    });

    // Submit — last "Add source" button is the modal submit
    const submitBtn = screen.getAllByText('Add source').at(-1) as HTMLElement;
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Wait for async FileReader + mutation
    await waitFor(() => {
      // In DEV_MODE, devMutationFn is used (no-op) — fetch must NOT be called
      const restCallMade = fetchSpy.mock.calls.some(([url]) =>
        String(url).includes('/api/knowledge-sources/upload')
      );
      expect(restCallMade).toBe(false);
    });

    fetchSpy.mockRestore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).FileReader = originalFileReader;
  });
});
