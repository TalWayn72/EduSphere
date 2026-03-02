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
