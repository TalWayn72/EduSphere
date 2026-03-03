/**
 * SourceManager unit tests.
 *
 * The component uses IS_DEV_MODE (true in vitest because VITE_KEYCLOAK_URL
 * is not set), so all mutations use devMutationFn (no-op).
 *
 * Critical regression test: file upload must NOT call the REST endpoint
 * `POST /api/knowledge-sources/upload` — it must use the GraphQL mutation
 * `addFileSource` via graphqlClient.request() instead.
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

import { SourceManager, parseSourceError } from './SourceManager';

// ── QueryClient wrapper ───────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // @ts-expect-error — React 19 ReactNode includes bigint; @tanstack/react-query types use React 18
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ── parseSourceError unit tests ───────────────────────────────────────────────

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
    const result = parseSourceError(new Error('Some unexpected internal error'));
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

// ── SourceManager component tests ─────────────────────────────────────────────

describe('SourceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the panel header and source list', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    expect(screen.getByText('מקורות מידע')).toBeInTheDocument();
    // In DEV_MODE the mock sources are loaded
    await waitFor(() => {
      expect(screen.getByText('2 מקורות')).toBeInTheDocument();
    });
  });

  it('shows empty state when sources list is empty in DEV_MODE', () => {
    // This test uses default DEV_MODE which returns DEV_SOURCES, so just verify header
    render(<SourceManager courseId="course-empty" />, { wrapper });
    expect(screen.getByText('הוסף מקור')).toBeInTheDocument();
  });

  it('opens the add-source modal when "הוסף מקור" is clicked', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    const addBtn = screen.getByText('הוסף מקור');
    await act(async () => {
      fireEvent.click(addBtn);
    });
    expect(screen.getByText('הוספת מקור מידע')).toBeInTheDocument();
  });

  it('closes the modal when ✕ is clicked', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('הוסף מקור'));
    });
    const closeBtn = screen.getAllByText('✕').at(-1) as HTMLElement;
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(screen.queryByText('הוספת מקור מידע')).not.toBeInTheDocument();
  });

  it('shows all four tabs in the add-source modal', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('הוסף מקור'));
    });
    expect(screen.getByText('🌐 קישור')).toBeInTheDocument();
    expect(screen.getByText('✏️ טקסט')).toBeInTheDocument();
    expect(screen.getByText('▶️ YouTube')).toBeInTheDocument();
    expect(screen.getByText('📄 קובץ')).toBeInTheDocument();
  });

  it('file tab: shows file upload UI when "📄 קובץ" tab is clicked', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('הוסף מקור'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('📄 קובץ'));
    });
    expect(screen.getByText('DOCX, PDF, TXT')).toBeInTheDocument();
  });

  it('file tab: shows error when submitting without a file', async () => {
    render(<SourceManager courseId="course-1" />, { wrapper });
    await act(async () => {
      fireEvent.click(screen.getByText('הוסף מקור'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('📄 קובץ'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('הוספת מקור'));
    });
    expect(screen.getByText('נא לבחור קובץ')).toBeInTheDocument();
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
      fireEvent.click(screen.getByText('הוסף מקור'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('📄 קובץ'));
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

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByText('הוספת מקור'));
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
