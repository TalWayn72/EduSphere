/**
 * LessonPreviewPage unit tests — Phase 65.
 *
 * Tests: sticky preview banner, lesson content rendering, no edit buttons,
 * loading skeleton, back button navigation.
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span>{children}</span>,
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

const LESSON_DATA = {
  lesson: {
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
  },
};

function makeDataQuery(data: unknown) {
  return [
    { data, fetching: false, error: undefined },
    vi.fn(),
  ] as never;
}

function makeLoadingQuery() {
  return [
    { data: undefined, fetching: true, error: undefined },
    vi.fn(),
  ] as never;
}

function makeErrorQuery() {
  return [
    { data: undefined, fetching: false, error: { message: 'Network error' } },
    vi.fn(),
  ] as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonPreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sticky preview banner with Hebrew text', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
    render(<LessonPreviewPage />);

    expect(screen.getByRole('banner', { name: /תצוגה מקדימה/i })).toBeInTheDocument();
    expect(screen.getByText(/תצוגה מקדימה/)).toBeInTheDocument();
  });

  it('shows lesson title', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
    render(<LessonPreviewPage />);

    expect(screen.getByText('שיעור ראשון')).toBeInTheDocument();
  });

  it('shows lesson type, series and date', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
    render(<LessonPreviewPage />);

    expect(screen.getByText(/הגות/)).toBeInTheDocument();
    expect(screen.getByText(/סדרה א/)).toBeInTheDocument();
  });

  it('shows lesson assets', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
    render(<LessonPreviewPage />);

    expect(screen.getByText('חומרי שיעור')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
    expect(screen.getByText('NOTES')).toBeInTheDocument();
  });

  it('renders pipeline results (structured notes)', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
    render(<LessonPreviewPage />);

    expect(screen.getByText('תוצרי השיעור')).toBeInTheDocument();
    expect(screen.getByText('סיכום מובנה')).toBeInTheDocument();
    expect(screen.getByText('דיאגרמות')).toBeInTheDocument();
  });

  it('does NOT render edit/mutation buttons', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
    render(<LessonPreviewPage />);

    // No edit, save, delete, or publish buttons should be visible
    const allButtons = screen.getAllByRole('button');
    const buttonTexts = allButtons.map((b) => b.textContent ?? '');
    expect(buttonTexts.join(' ')).not.toMatch(/עריכה|שמירה|מחיקה|פרסום|edit|save|delete|publish/i);
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeLoadingQuery());
    render(<LessonPreviewPage />);

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
    // Should still show the banner during loading
    expect(screen.getByRole('banner', { name: /תצוגה מקדימה/i })).toBeInTheDocument();
  });

  it('close button on banner navigates back', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
    render(<LessonPreviewPage />);

    const closeBtn = screen.getByRole('button', { name: /סגור תצוגה מקדימה/i });
    fireEvent.click(closeBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-abc/lessons/550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('shows error message on query error', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeErrorQuery());
    render(<LessonPreviewPage />);

    expect(screen.getByText('שגיאה בטעינת השיעור.')).toBeInTheDocument();
  });

  it('shows not found message when lesson is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeDataQuery({ lesson: null })
    );
    render(<LessonPreviewPage />);

    expect(screen.getByText('השיעור לא נמצא.')).toBeInTheDocument();
  });

  it('shows empty results message when no pipeline results', () => {
    const lessonNoResults = {
      lesson: {
        ...LESSON_DATA.lesson,
        pipeline: null,
      },
    };
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(lessonNoResults));
    render(<LessonPreviewPage />);

    expect(screen.getByText('אין עדיין תוצרים לשיעור זה')).toBeInTheDocument();
  });

  it('renders file link for results with fileUrl', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeDataQuery(LESSON_DATA));
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
    vi.mocked(urql.useQuery).mockReturnValue(
      makeDataQuery({ lesson: null })
    );
    render(<LessonPreviewPage />);

    expect(screen.getByText('השיעור לא נמצא.')).toBeInTheDocument();
  });
});
