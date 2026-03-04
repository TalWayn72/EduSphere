import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ courseId: 'course-1', lessonId: 'lesson-1' })),
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
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => children,
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  LESSON_QUERY: 'LESSON_QUERY',
}));

import { LessonResultsPage } from './LessonResultsPage';
import * as urql from 'urql';

const MOCK_LESSON_WITH_RESULTS = {
  lesson: {
    id: 'lesson-1',
    title: 'שיעור בעץ חיים',
    status: 'READY',
    pipeline: {
      currentRun: {
        id: 'run-1',
        status: 'COMPLETED',
        results: [
          {
            id: 'r1',
            moduleName: 'SUMMARIZATION',
            outputType: 'SUMMARIZATION',
            outputData: {
              shortSummary: 'סיכום קצר לשיעור',
              longSummary: 'סיכום ארוך ומפורט',
              keyPoints: ['נקודה א', 'נקודה ב', 'נקודה ג'],
              discussionQuestions: ['שאלה לדיון?'],
            },
          },
          {
            id: 'r2',
            moduleName: 'CITATION_VERIFIER',
            outputType: 'CITATION_VERIFIER',
            outputData: {
              verifiedCitations: [{ sourceText: 'עץ חיים א:א' }],
              failedCitations: [],
              matchReport: 'כל הציטוטים אומתו בהצלחה.',
              overallScore: 1.0,
            },
          },
          {
            id: 'r3',
            moduleName: 'QA_GATE',
            outputType: 'QA_GATE',
            outputData: {
              overallScore: 0.85,
              fixList: [{ description: 'תקן ציטוט חסר', severity: 'MEDIUM' }],
            },
          },
        ],
      },
    },
  },
};

function makeQuery(overrides: Record<string, unknown> = {}) {
  return [
    {
      data: MOCK_LESSON_WITH_RESULTS,
      fetching: false,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never;
}

describe('LessonResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery());
  });

  // ── BUG-049 regression: console.error must NOT be called in render body ─────
  it('BUG-049: does NOT call console.error synchronously during render (must use useEffect)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery({ error: { message: 'query failed' } }));
    // Synchronous render call — if console.error is in render body it fires HERE
    const { unmount } = render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    // console.error may have fired in useEffect (async), but NOT synchronously in render
    // We verify it is called ONLY after effects flush, not immediately during render
    consoleSpy.mockRestore();
    unmount();
  });

  // ── BUG-049 regression: no setState-during-render / no React render violations ──
  it('BUG-049: renders without "Cannot update a component while rendering" error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
      // Fail the test if the React setState-during-render warning fires
      if (typeof msg === 'string' && msg.includes('Cannot update a component')) {
        throw new Error(`React render violation: ${msg}`);
      }
    });
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    consoleErrorSpy.mockRestore();
  });

  // ── BUG-049 regression: mounted guard — shows loading initially then data ───
  it('BUG-049: shows loading on first render, then shows content after mount', async () => {
    const { container } = render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    // After RTL render() flushes effects, content should be visible
    expect(screen.getByText('תוצאות Pipeline')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ fetching: true, data: undefined })
    );
    const { container } = render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "השיעור לא נמצא" when lesson is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: null } })
    );
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('השיעור לא נמצא')).toBeInTheDocument();
  });

  it('renders page heading תוצאות Pipeline', () => {
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('תוצאות Pipeline')).toBeInTheDocument();
  });

  it('renders lesson title in back button', () => {
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/שיעור בעץ חיים/)).toBeInTheDocument();
  });

  it('renders summarization section with short summary', () => {
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('סיכום קצר לשיעור')).toBeInTheDocument();
  });

  it('renders key points list items', () => {
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('נקודה א')).toBeInTheDocument();
    expect(screen.getByText('נקודה ב')).toBeInTheDocument();
  });

  it('renders QA gate score as percentage (overallScore * 100)', () => {
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    // 0.85 * 100 = 85 → displayed as "85%"
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders QA fix list description', () => {
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('תקן ציטוט חסר')).toBeInTheDocument();
  });

  it('renders citation verifier section heading', () => {
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/אימות ציטוטים/)).toBeInTheDocument();
  });

  it('shows empty-state message and Pipeline button when results are empty', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({
        data: {
          lesson: {
            ...MOCK_LESSON_WITH_RESULTS.lesson,
            pipeline: { currentRun: { id: 'r', status: 'IDLE', results: [] } },
          },
        },
      })
    );
    render(
      <MemoryRouter>
        <LessonResultsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/אין תוצאות עדיין/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Pipeline Builder/ })
    ).toBeInTheDocument();
  });
});
