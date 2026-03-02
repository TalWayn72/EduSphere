import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

import { LessonDetailPage } from './LessonDetailPage';
import * as urql from 'urql';

const MOCK_LESSON = {
  id: 'lesson-1',
  title: 'שיעור ראשון בעץ חיים',
  type: 'SEQUENTIAL',
  series: 'ספר עץ חיים',
  lessonDate: '2024-01-15',
  status: 'READY',
  assets: [
    {
      id: 'a1',
      assetType: 'VIDEO',
      sourceUrl: 'https://youtube.com/watch?v=test',
      fileUrl: null,
    },
    {
      id: 'a2',
      assetType: 'NOTES',
      sourceUrl: null,
      fileUrl: 'https://storage/notes.pdf',
    },
  ],
  pipeline: { id: 'p1', status: 'COMPLETED' },
};

function makeQuery(overrides: Record<string, unknown> = {}) {
  return [
    {
      data: { lesson: MOCK_LESSON },
      fetching: false,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never;
}

describe('LessonDetailPage', () => {
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
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows Hebrew error message on query failure', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ error: { message: 'Network error' }, data: undefined })
    );
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/שגיאה/)).toBeInTheDocument();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('shows "השיעור לא נמצא" when lesson is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: null } })
    );
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByText('השיעור לא נמצא')).toBeInTheDocument();
  });

  it('renders lesson title', () => {
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByText('שיעור ראשון בעץ חיים')).toBeInTheDocument();
  });

  it('shows Hebrew READY status label "מוכן"', () => {
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByText('מוכן')).toBeInTheDocument();
  });

  it('shows Hebrew DRAFT status label "טיוטה" for draft lesson', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON, status: 'DRAFT' } } })
    );
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByText('טיוטה')).toBeInTheDocument();
  });

  it('renders asset section with VIDEO and NOTES items', () => {
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByText('חומרים')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
    expect(screen.getByText('NOTES')).toBeInTheDocument();
  });

  it('renders Pipeline button with correct label', () => {
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('button', { name: /פתח Pipeline/ })
    ).toBeInTheDocument();
  });

  it('renders Results button when status is READY', () => {
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('button', { name: /צפה בתוצאות/ })
    ).toBeInTheDocument();
  });

  it('hides Results button when status is DRAFT', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON, status: 'DRAFT' } } })
    );
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    expect(
      screen.queryByRole('button', { name: /צפה בתוצאות/ })
    ).not.toBeInTheDocument();
  });

  it('clicking Pipeline button navigates to pipeline route', () => {
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /פתח Pipeline/ }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-1/lessons/lesson-1/pipeline'
    );
  });

  it('clicking back button navigates to course detail', () => {
    render(
      <MemoryRouter>
        <LessonDetailPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /חזרה לקורס/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');
  });
});
