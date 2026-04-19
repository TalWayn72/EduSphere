/**
 * Regression tests for LessonEnrichmentEditor — error state bug fix.
 *
 * BUG: When useEnrichedLesson returned an error (e.g. GraphQL/RLS failure),
 * the component silently rendered a blank editor with no user feedback.
 * This could trigger the Error Boundary if child components tried to render
 * with null data that they didn't guard against.
 *
 * FIX: Component now shows a user-friendly error state with a retry button
 * whenever error is truthy and fetching is false.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// ── Mock heavy dependencies first ─────────────────────────────────────────────

vi.mock('@/hooks/useEnrichedLesson', () => ({
  useEnrichedLesson: vi.fn(),
}));

vi.mock('@/hooks/useCitationReview', () => ({
  useCitationReview: vi.fn(() => ({
    approve: vi.fn(),
    reject: vi.fn(),
    updateCitation: vi.fn(),
    loading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(() => ({
    playerRef: { current: null },
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    seekPending: false,
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
    togglePlay: vi.fn(),
    handleTimeUpdate: vi.fn(),
    handleReady: vi.fn(),
    handleStateChange: vi.fn(),
  })),
}));

vi.mock('@/hooks/usePlayerKeyboardShortcuts', () => ({
  usePlayerKeyboardShortcuts: vi.fn(),
}));

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [{ data: null, fetching: false }, vi.fn()]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}));

vi.mock('@/lib/graphql/enriched-lesson.queries', () => ({
  ENRICHED_LESSON_QUERY: 'ENRICHED_LESSON_QUERY',
  INGEST_YOUTUBE_LESSON_MUTATION: 'INGEST_YOUTUBE_LESSON_MUTATION',
  SET_BLOCK_ANCHOR_TIMESTAMP_MUTATION: 'SET_BLOCK_ANCHOR_TIMESTAMP_MUTATION',
  PUBLISH_ENRICHED_LESSON_MUTATION: 'PUBLISH_ENRICHED_LESSON_MUTATION',
}));

vi.mock('@/lib/graphql/polished-transcript.queries', () => ({
  POLISHED_TRANSCRIPT_QUERY: 'POLISHED_TRANSCRIPT_QUERY',
  REQUEST_TRANSCRIPT_POLISHING_MUTATION:
    'REQUEST_TRANSCRIPT_POLISHING_MUTATION',
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'layout' }, children),
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) =>
    React.createElement('h1', { 'data-testid': 'page-header' }, title),
}));

vi.mock('@/components/lesson/YouTubeUrlInput', () => ({
  YouTubeUrlInput: () =>
    React.createElement('div', { 'data-testid': 'yt-url-input' }),
}));

vi.mock('@/components/youtube/YouTubeEmbedPlayer', () => ({
  YouTubeEmbedPlayer: () =>
    React.createElement('div', { 'data-testid': 'yt-player' }),
}));

vi.mock('@/components/enriched-transcript/SyncTranscriptScroller', () => ({
  SyncTranscriptScroller: () =>
    React.createElement('div', { 'data-testid': 'sync-scroller' }),
}));

vi.mock('@/components/enriched-transcript/EnrichedTranscriptPanel', () => ({
  EnrichedTranscriptPanel: () =>
    React.createElement('div', { 'data-testid': 'enriched-panel' }),
}));

vi.mock('@/components/lesson/CitationReviewPanel', () => ({
  CitationReviewPanel: () =>
    React.createElement('div', { 'data-testid': 'citation-panel' }),
}));

vi.mock('@/components/lesson/CitationEditModal', () => ({
  CitationEditModal: () =>
    React.createElement('div', { 'data-testid': 'citation-modal' }),
}));

vi.mock('@/components/lesson/TimestampAnchorEditor', () => ({
  TimestampAnchorEditor: () =>
    React.createElement('div', { 'data-testid': 'anchor-editor' }),
}));

vi.mock('@/components/polished-transcript/TrackChangesReview', () => ({
  TrackChangesReview: () =>
    React.createElement('div', { 'data-testid': 'track-changes' }),
}));

vi.mock('@/components/polished-transcript/PolishingProgressOverlay', () => ({
  PolishingProgressOverlay: () =>
    React.createElement('div', { 'data-testid': 'polishing-overlay' }),
}));

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  ResizablePanel: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  ResizableHandle: () => React.createElement('div', {}),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  TabsList: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  TabsTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', {}, children),
  TabsContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      'button',
      { onClick, disabled, 'data-testid': 'button' },
      children
    ),
}));

vi.mock('lucide-react', () => ({
  Send: () => React.createElement('span', { 'data-testid': 'send-icon' }),
  AlertCircle: () =>
    React.createElement('span', { 'data-testid': 'alert-circle' }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { LessonEnrichmentEditor } from './LessonEnrichmentEditor';
import { useEnrichedLesson } from '@/hooks/useEnrichedLesson';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(lessonId = 'lesson-001') {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${lessonId}/edit`]}>
      <Routes>
        <Route
          path="/lesson/:lessonId/edit"
          element={<LessonEnrichmentEditor />}
        />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonEnrichmentEditor — error state regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error alert when useEnrichedLesson returns an error', () => {
    // BUG: before fix, this rendered a blank editor with no error feedback.
    // FIX: now renders an alert with the error message and retry button.
    vi.mocked(useEnrichedLesson).mockReturnValue({
      data: null,
      fetching: false,
      error: 'Lesson not found',
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load lesson')).toBeInTheDocument();
    expect(screen.getByText('Lesson not found')).toBeInTheDocument();
  });

  it('shows AlertCircle icon in error state', () => {
    vi.mocked(useEnrichedLesson).mockReturnValue({
      data: null,
      fetching: false,
      error: 'Authentication required',
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
  });

  it('retry button calls refetch', () => {
    const mockRefetch = vi.fn();
    vi.mocked(useEnrichedLesson).mockReturnValue({
      data: null,
      fetching: false,
      error: 'GraphQL error: tenant not found',
      refetch: mockRefetch,
    });

    renderPage();

    const retryButton = screen.getByText('Try again');
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT show error alert when error is null (happy path)', () => {
    vi.mocked(useEnrichedLesson).mockReturnValue({
      data: null,
      fetching: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to load lesson')).not.toBeInTheDocument();
  });

  it('does NOT show error alert while still fetching (loading state)', () => {
    // Edge case: error might be populated during refetch — must not flash error UI.
    vi.mocked(useEnrichedLesson).mockReturnValue({
      data: null,
      fetching: true,
      error: 'temporary error during reload',
      refetch: vi.fn(),
    });

    renderPage();

    // When fetching=true, error UI should be suppressed
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the page header in the happy path', () => {
    vi.mocked(useEnrichedLesson).mockReturnValue({
      data: null,
      fetching: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });
});
