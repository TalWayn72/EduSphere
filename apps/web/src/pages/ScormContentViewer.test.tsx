import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + String(values[i] ?? ''), ''),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/scorm/ScormPlayer', () => ({
  ScormPlayer: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="scorm-player" data-session={sessionId} />
  ),
}));

vi.mock('@/hooks/useScormSession', () => ({
  useScormSession: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ScormContentViewer } from './ScormContentViewer';
import { useScormSession } from '@/hooks/useScormSession';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockInitSession = vi.fn().mockResolvedValue(undefined);

function setHook(overrides: Partial<ReturnType<typeof useScormSession>>) {
  vi.mocked(useScormSession).mockReturnValue({
    initSession: mockInitSession,
    session: null,
    fetching: false,
    error: null,
    ...overrides,
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/scorm/scorm-123']}>
      <ScormContentViewer />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScormContentViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHook({});
  });

  it('renders within Layout', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders "SCORM Content" heading', () => {
    renderPage();
    expect(screen.getByText('SCORM Content')).toBeInTheDocument();
  });

  it('shows loading spinner and text when fetching', () => {
    setHook({ fetching: true });
    renderPage();
    expect(screen.getByText(/Initializing SCORM session/i)).toBeInTheDocument();
  });

  it('shows error message and Retry button on error', () => {
    setHook({ error: 'Session initialization failed' });
    renderPage();
    expect(
      screen.getByText('Session initialization failed')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls initSession again when Retry is clicked', () => {
    setHook({ error: 'Failed' });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockInitSession).toHaveBeenCalled();
  });

  it('renders ScormPlayer when session is available and not fetching', () => {
    setHook({
      session: {
        id: 'sess-1',
        lessonStatus: 'incomplete',
        scoreRaw: null,
        suspendData: null,
      },
    });
    renderPage();
    expect(screen.getByTestId('scorm-player')).toBeInTheDocument();
  });

  it('shows lesson status when session is available', () => {
    setHook({
      session: {
        id: 'sess-1',
        lessonStatus: 'completed',
        scoreRaw: null,
        suspendData: null,
      },
    });
    renderPage();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('shows score when scoreRaw is not null', () => {
    setHook({
      session: {
        id: 'sess-1',
        lessonStatus: 'passed',
        scoreRaw: 85,
        suspendData: null,
      },
    });
    renderPage();
    expect(screen.getByText('Score: 85')).toBeInTheDocument();
  });

  it('does not show score when scoreRaw is null', () => {
    setHook({
      session: {
        id: 'sess-1',
        lessonStatus: 'incomplete',
        scoreRaw: null,
        suspendData: null,
      },
    });
    renderPage();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });

  it('does not render ScormPlayer while fetching even if session exists', () => {
    setHook({
      fetching: true,
      session: {
        id: 'sess-1',
        lessonStatus: 'incomplete',
        scoreRaw: null,
        suspendData: null,
      },
    });
    renderPage();
    expect(screen.queryByTestId('scorm-player')).not.toBeInTheDocument();
  });
});
