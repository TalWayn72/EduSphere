/**
 * LessonPreviewPage unit tests — Phase 65.
 *
 * Tests: sticky preview banner, lesson content rendering, enriched blocks,
 * YouTube embed, no edit buttons, loading skeleton, back button navigation.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({
      courseId: 'course-abc',
      lessonId: '550e8400-e29b-41d4-a716-446655440000',
    })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  LESSON_QUERY: 'LESSON_QUERY',
}));

vi.mock('@/lib/graphql/enriched-lesson.queries', () => ({
  ENRICHED_LESSON_QUERY: 'ENRICHED_LESSON_QUERY',
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import { LessonPreviewPage } from './LessonPreviewPage';
import * as urql from 'urql';
import * as router from 'react-router-dom';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_LESSON = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'שיעור ראשון',
  type: 'THEMATIC',
  series: 'סדרה א',
  lessonDate: '2026-01-15T00:00:00Z',
  status: 'DRAFT',
  assets: [
    { id: 'a1', assetType: 'VIDEO', sourceUrl: 'http://example.com/v.mp4' },
    { id: 'a2', assetType: 'NOTES', fileUrl: 'http://example.com/n.pdf' },
  ],
  pipeline: {
    id: 'pipe-1',
    status: 'COMPLETED',
    currentRun: {
      results: [
        {
          id: 'r1',
          moduleName: 'STRUCTURED_NOTES',
          outputType: 'MARKDOWN',
          outputData: { shortSummary: 'סיכום קצר של השיעור' },
          fileUrl: null,
        },
        {
          id: 'r2',
          moduleName: 'DIAGRAM_GENERATOR',
          outputType: 'SVG',
          outputData: null,
          fileUrl: 'http://example.com/diagram.svg',
        },
      ],
    },
  },
};

const LESSON_DATA = { lesson: BASE_LESSON };

const ENRICHED_DATA_READY = {
  enrichedLesson: {
    id: 'enriched-1',
    youtubeVideoId: 'abc123',
    transcriptReady: true,
    enrichmentStatus: 'READY',
    blocks: [
      {
        id: 'b1',
        lessonId: BASE_LESSON.id,
        blockType: 'HEADING',
        blockOrder: 1,
        content: { text: 'כותרת ראשית' },
        startTime: null,
        endTime: null,
        citation: null,
        anchor: null,
        segmentId: null,
      },
      {
        id: 'b2',
        lessonId: BASE_LESSON.id,
        blockType: 'TEXT',
        blockOrder: 2,
        content: { text: 'תוכן עשיר של השיעור' },
        startTime: 10,
        endTime: 30,
        citation: null,
        anchor: null,
        segmentId: null,
      },
    ],
  },
};

const ENRICHED_DATA_EMPTY = {
  enrichedLesson: {
    id: 'enriched-2',
    youtubeVideoId: null,
    transcriptReady: false,
    enrichmentStatus: 'PENDING',
    blocks: [],
  },
};

/** Mock useQuery to return first call for LESSON_QUERY and second for ENRICHED_LESSON_QUERY */
function mockBothQueries(lessonResult: unknown, enrichedResult: unknown): void {
  let callCount = 0;
  vi.mocked(urql.useQuery).mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      // First call — LESSON_QUERY
      return [
        { data: lessonResult, fetching: false, error: undefined },
        vi.fn(),
      ] as never;
    }
    // Second call — ENRICHED_LESSON_QUERY
    return [
      { data: enrichedResult, fetching: false, error: undefined },
      vi.fn(),
    ] as never;
  });
}

function mockBothLoading(): void {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: undefined, fetching: true, error: undefined },
    vi.fn(),
  ] as never);
}

function mockLessonError(): void {
  let callCount = 0;
  vi.mocked(urql.useQuery).mockImplementation(() => {
    callCount++;
    if (callCount % 2 === 1) {
      return [
        {
          data: undefined,
          fetching: false,
          error: { message: 'Network error' },
        },
        vi.fn(),
      ] as never;
    }
    return [
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ] as never;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonPreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(router.useParams).mockReturnValue({
      courseId: 'course-abc',
      lessonId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('renders sticky preview banner with Hebrew text', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    expect(
      screen.getByRole('banner', { name: /תצוגה מקדימה/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/תצוגה מקדימה/)).toBeInTheDocument();
  });

  it('shows lesson title', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    expect(screen.getByText('שיעור ראשון')).toBeInTheDocument();
  });

  it('shows lesson type and series', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    expect(screen.getByText(/הגות/)).toBeInTheDocument();
    expect(screen.getByText(/סדרה א/)).toBeInTheDocument();
  });

  it('shows lesson assets', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    expect(screen.getByText('חומרי שיעור')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
    expect(screen.getByText('NOTES')).toBeInTheDocument();
  });

  it('renders enriched HEADING block when enrichmentStatus is READY', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    expect(screen.getByText('כותרת ראשית')).toBeInTheDocument();
    expect(screen.getByText('תוכן עשיר של השיעור')).toBeInTheDocument();
  });

  it('renders "תוכן מועשר" section heading for enriched blocks', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    expect(screen.getByText('תוכן מועשר')).toBeInTheDocument();
  });

  it('renders YouTube iframe when youtubeVideoId is present', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.getAttribute('src')).toContain('abc123');
  });

  it('renders enriched blocks when enrichmentStatus is PUBLISHED', () => {
    const enrichedPublished = {
      enrichedLesson: {
        ...ENRICHED_DATA_READY.enrichedLesson,
        enrichmentStatus: 'PUBLISHED',
      },
    };
    mockBothQueries(LESSON_DATA, enrichedPublished);
    render(<LessonPreviewPage />);

    expect(screen.getByText('תוכן מועשר')).toBeInTheDocument();
    expect(screen.getByText('כותרת ראשית')).toBeInTheDocument();
  });

  it('does NOT render enriched section when enrichmentStatus is PENDING', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_EMPTY);
    render(<LessonPreviewPage />);

    expect(screen.queryByText('תוכן מועשר')).not.toBeInTheDocument();
  });

  it('shows pipeline results as fallback when no enriched blocks', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_EMPTY);
    render(<LessonPreviewPage />);

    expect(screen.getByText('תוצרי השיעור')).toBeInTheDocument();
    expect(screen.getByText('STRUCTURED_NOTES')).toBeInTheDocument();
  });

  it('shows empty state only when no enriched blocks AND no pipeline results', () => {
    const lessonNoResults = {
      lesson: { ...BASE_LESSON, pipeline: null },
    };
    mockBothQueries(lessonNoResults, ENRICHED_DATA_EMPTY);
    render(<LessonPreviewPage />);

    expect(screen.getByText('אין עדיין תוצרים לשיעור זה')).toBeInTheDocument();
  });

  it('does NOT render edit/mutation buttons', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    const allButtons = screen.getAllByRole('button');
    const buttonTexts = allButtons.map((b) => b.textContent ?? '');
    expect(buttonTexts.join(' ')).not.toMatch(
      /עריכה|שמירה|מחיקה|פרסום|edit|save|delete|publish/i
    );
  });

  it('shows loading skeleton while fetching', () => {
    mockBothLoading();
    render(<LessonPreviewPage />);

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole('banner', { name: /תצוגה מקדימה/i })
    ).toBeInTheDocument();
  });

  it('close button on banner navigates back', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_READY);
    render(<LessonPreviewPage />);

    const closeBtn = screen.getByRole('button', { name: /סגור תצוגה מקדימה/i });
    fireEvent.click(closeBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-abc/lessons/550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('shows error message on query error', () => {
    mockLessonError();
    render(<LessonPreviewPage />);

    expect(screen.getByText('שגיאה בטעינת השיעור.')).toBeInTheDocument();
  });

  it('shows not found message when lesson is null', () => {
    mockBothQueries({ lesson: null }, ENRICHED_DATA_EMPTY);
    render(<LessonPreviewPage />);

    expect(screen.getByText('השיעור לא נמצא.')).toBeInTheDocument();
  });

  it('renders file link for pipeline results with fileUrl', () => {
    mockBothQueries(LESSON_DATA, ENRICHED_DATA_EMPTY);
    render(<LessonPreviewPage />);

    const fileLink = screen.getByText('פתח קובץ');
    expect(fileLink).toBeInTheDocument();
    expect(fileLink.closest('a')).toHaveAttribute(
      'href',
      'http://example.com/diagram.svg'
    );
  });

  it('invalid lessonId shows not found', () => {
    vi.mocked(router.useParams).mockReturnValue({
      courseId: 'course-abc',
      lessonId: 'not-a-uuid',
    });
    mockBothQueries({ lesson: null }, { enrichedLesson: null });
    render(<LessonPreviewPage />);

    expect(screen.getByText('השיעור לא נמצא.')).toBeInTheDocument();
  });
});
