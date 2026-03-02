import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks (hoisted by vitest) ─────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ courseId: 'course-1' })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));

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
  CREATE_LESSON_MUTATION: 'CREATE_LESSON_MUTATION',
  ADD_LESSON_ASSET_MUTATION: 'ADD_LESSON_ASSET_MUTATION',
}));

vi.mock('@/lib/lesson-pipeline.store', () => ({
  useLessonPipelineStore: vi.fn(
    (selector: (s: { loadTemplate: ReturnType<typeof vi.fn> }) => unknown) =>
      selector({ loadTemplate: vi.fn() })
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CreateLessonPage } from './CreateLessonPage';
import * as auth from '@/lib/auth';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-1',
  role: 'INSTRUCTOR',
  username: 'ins1',
  email: 'a@b.com',
  tenantId: 't1',
  firstName: 'Test',
  lastName: 'User',
  scopes: [] as string[],
};

const NOOP_EXECUTE = vi
  .fn()
  .mockResolvedValue({ data: null, error: undefined });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateLessonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_USER as never);
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      NOOP_EXECUTE,
    ] as never);
  });

  it('renders step 1 heading and lesson title input', () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    expect(screen.getByText('פרטי שיעור')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/שיעור עץ חיים/i)).toBeInTheDocument();
  });

  it('renders THEMATIC and SEQUENTIAL radio buttons in step 1', () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    expect(screen.getByText('הגות (נושאי)')).toBeInTheDocument();
    expect(screen.getByText('על הסדר')).toBeInTheDocument();
  });

  it('shows validation error when title is too short', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => {
      expect(
        screen.getByText('כותרת חייבת להכיל לפחות 3 תווים')
      ).toBeInTheDocument();
    });
  });

  it('advances to step 2 when step 1 is submitted with valid title', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => {
      expect(screen.getByText('הוספת חומרים')).toBeInTheDocument();
    });
  });

  it('renders YouTube URL input in step 2', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/youtube\.com/i)).toBeInTheDocument();
    });
  });

  it('advances to step 3 via skip button in step 2', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => screen.getByText('הוספת חומרים'));
    fireEvent.click(screen.getByRole('button', { name: /דלג/i }));
    await waitFor(() => {
      expect(screen.getByText('בחר תבנית Pipeline')).toBeInTheDocument();
    });
  });

  it('shows both template cards in step 3', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => screen.getByText('הוספת חומרים'));
    fireEvent.click(screen.getByRole('button', { name: /דלג/i }));
    await waitFor(() => {
      expect(screen.getByText(/שיעור הגות/i)).toBeInTheDocument();
      expect(screen.getByText(/ספר עץ חיים/i)).toBeInTheDocument();
    });
  });

  it('submit button is disabled until a template is selected', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => screen.getByText('הוספת חומרים'));
    fireEvent.click(screen.getByRole('button', { name: /דלג/i }));
    await waitFor(() => screen.getByText('בחר תבנית Pipeline'));
    expect(screen.getByRole('button', { name: /צור שיעור/i })).toBeDisabled();
  });

  it('calls createLesson mutation when form is submitted', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: {
        createLesson: {
          id: 'lesson-1',
          courseId: 'course-1',
          title: 'T',
          status: 'DRAFT',
        },
      },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockExecute,
    ] as never);

    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => screen.getByText('הוספת חומרים'));
    fireEvent.click(screen.getByRole('button', { name: /דלג/i }));
    await waitFor(() => screen.getByText('בחר תבנית Pipeline'));
    fireEvent.click(
      screen
        .getByText(/שיעור הגות/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(screen.getByRole('button', { name: /צור שיעור/i }));
    await waitFor(() => expect(mockExecute).toHaveBeenCalled());
  });

  it('navigates to pipeline page after successful creation', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: {
        createLesson: {
          id: 'lesson-1',
          courseId: 'course-1',
          title: 'T',
          status: 'DRAFT',
        },
      },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockExecute,
    ] as never);

    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => screen.getByText('הוספת חומרים'));
    fireEvent.click(screen.getByRole('button', { name: /דלג/i }));
    await waitFor(() => screen.getByText('בחר תבנית Pipeline'));
    fireEvent.click(
      screen
        .getByText(/שיעור הגות/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(screen.getByRole('button', { name: /צור שיעור/i }));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        '/courses/course-1/lessons/lesson-1/pipeline'
      )
    );
  });

  it('shows error message on mutation failure', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Server error', graphQLErrors: [{ message: 'שגיאה' }] },
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockExecute,
    ] as never);

    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => screen.getByText('הוספת חומרים'));
    fireEvent.click(screen.getByRole('button', { name: /דלג/i }));
    await waitFor(() => screen.getByText('בחר תבנית Pipeline'));
    fireEvent.click(
      screen
        .getByText(/שיעור הגות/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(screen.getByRole('button', { name: /צור שיעור/i }));
    await waitFor(() => expect(screen.getByText('שגיאה')).toBeInTheDocument());
  });

  it('back button navigates to course page', () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /חזרה/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');
  });
});
