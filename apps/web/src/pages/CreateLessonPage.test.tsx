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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'createLesson.step1Title': 'Lesson Details',
        'createLesson.lessonTitleLabel': 'Lesson Title *',
        'createLesson.lessonTitlePlaceholder':
          'e.g. Tree of Life lesson — Gate of Cutting, paragraph 3',
        'createLesson.titleMinLength':
          'Title must contain at least 3 characters',
        'createLesson.lessonType': 'Lesson Type *',
        'createLesson.typeThematic': 'General (Thematic)',
        'createLesson.typeSequential': 'Sequential',
        'createLesson.lessonDate': 'Lesson Date',
        'createLesson.continueToMaterials': 'Continue to Materials \u2190',
        'createLesson.step2Title': 'Add Materials',
        'createLesson.step2Hint':
          'You can skip this step and add materials after creating the lesson',
        'createLesson.youtubeLink': '\uD83C\uDFA5 YouTube Link',
        'createLesson.youtubeValidation': 'Must be a valid YouTube URL',
        'createLesson.invalidUrl': 'Invalid URL',
        'createLesson.addButton': 'Add',
        'createLesson.linkAddedAfterCreation':
          'The link will be added after creating the lesson',
        'createLesson.notesFile': '\uD83D\uDCC4 Notes File (PDF)',
        'createLesson.supportedFormats': 'Supports PDF, Word, TXT files',
        'createLesson.skip': 'Skip',
        'createLesson.continueToTemplate': 'Continue to Template \u2190',
        'createLesson.selectTemplate': 'Select Pipeline Template',
        'createLesson.thematicDescription':
          'Instructor-defined topic — 8 processing steps',
        'createLesson.sequentialDescription':
          'Sequential study — 9 steps + citation verification',
        'createLesson.createAndContinue':
          'Create lesson & continue to Pipeline',
        'createLesson.creating': 'Creating lesson...',
        'createLesson.authError':
          'Authentication error — please log in again',
        'createLesson.networkError':
          'Network error — cannot connect to server. Try again.',
        back: 'Back',
        dismiss: 'Dismiss',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'en', dir: () => 'ltr' },
  }),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fill step 1 with valid title and advance to step 2 */
async function advanceToStep2() {
  fireEvent.change(screen.getByPlaceholderText(/Tree of Life lesson/i), {
    target: { value: 'Test Lesson Title' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: /Continue to Materials/i })
  );
  await waitFor(() => screen.getByText('Add Materials'));
}

/** Advance from step 2 to step 3 via skip */
async function advanceToStep3() {
  await advanceToStep2();
  fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
  await waitFor(() => screen.getByText(/Select Pipeline Template/i));
}

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
    expect(screen.getByText('Lesson Details')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Tree of Life lesson/i)
    ).toBeInTheDocument();
  });

  it('renders THEMATIC and SEQUENTIAL radio buttons in step 1', () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    expect(screen.getByText('General (Thematic)')).toBeInTheDocument();
    expect(screen.getByText('Sequential')).toBeInTheDocument();
  });

  it('shows validation error when title is too short', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Continue to Materials/i })
    );
    await waitFor(() => {
      expect(
        screen.getByText('Title must contain at least 3 characters')
      ).toBeInTheDocument();
    });
  });

  it('advances to step 2 when step 1 is submitted with valid title', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep2();
    expect(screen.getByText('Add Materials')).toBeInTheDocument();
  });

  it('renders YouTube URL input in step 2', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep2();
    expect(screen.getByPlaceholderText(/youtube\.com/i)).toBeInTheDocument();
  });

  it('advances to step 3 via skip button in step 2', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep3();
    expect(
      screen.getByText(/Select Pipeline Template/i)
    ).toBeInTheDocument();
  });

  it('shows both template cards in step 3', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep3();
    expect(screen.getByText(/General \(Thematic\)/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Sequential/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('submit button is disabled until a template is selected', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep3();
    expect(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    ).toBeDisabled();
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
    await advanceToStep3();
    fireEvent.click(
      screen
        .getByText(/General \(Thematic\)/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    );
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
    await advanceToStep3();
    fireEvent.click(
      screen
        .getByText(/General \(Thematic\)/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        '/courses/course-1/lessons/lesson-1/pipeline'
      )
    );
  });

  it('shows error message on mutation failure', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Server error',
        graphQLErrors: [{ message: 'הקורס לא נמצא' }],
      },
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
    await advanceToStep3();
    fireEvent.click(
      screen
        .getByText(/General \(Thematic\)/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    );
    await waitFor(() =>
      expect(screen.getByText('הקורס לא נמצא')).toBeInTheDocument()
    );
  });

  it('error alert has dismiss button that clears the error', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'err', graphQLErrors: [{ message: 'שגיאה בדיקה' }] },
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
    await advanceToStep3();
    fireEvent.click(
      screen
        .getByText(/General \(Thematic\)/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    );
    await waitFor(() => screen.getByText('שגיאה בדיקה'));
    // Click dismiss
    fireEvent.click(screen.getByText('Dismiss'));
    await waitFor(() => {
      expect(screen.queryByText('שגיאה בדיקה')).not.toBeInTheDocument();
    });
  });

  it('network error shows localized message instead of raw technical error', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'fetch failed',
        graphQLErrors: [],
        networkError: { message: 'Failed to fetch' },
      },
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
    await advanceToStep3();
    fireEvent.click(
      screen
        .getByText(/General \(Thematic\)/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    );
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toMatch(/Network error|שגיאת רשת/);
      expect(alert.textContent).not.toContain('Failed to fetch');
    });
  });

  it('back button navigates to course page', () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    // The top-level "Back" button (ghost variant) is always visible and navigates to courses
    const backButtons = screen.getAllByRole('button', { name: /Back/i });
    // The header back button is the first (ghost variant) — click it
    fireEvent.click(backButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');
  });

  // ── BUG-049 regression: silent failure when user is null must show error ─────
  it('BUG-049: shows auth error when user is null instead of silently failing', async () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(null as never);
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep3();
    fireEvent.click(
      screen
        .getByText(/General \(Thematic\)/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    );
    await waitFor(() => {
      const errorEl = screen.getByRole('alert');
      expect(errorEl).toBeInTheDocument();
      expect(errorEl.textContent).toMatch(
        /Authentication error|שגיאת אימות/
      );
    });
  });

  it('BUG-049: createLesson mutation NOT called when user is null (no silent return)', async () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(null as never);
    const mockExecute = vi.fn();
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockExecute,
    ] as never);
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep3();
    fireEvent.click(
      screen
        .getByText(/General \(Thematic\)/i)
        .closest('[class*="border"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /Create lesson & continue to Pipeline/i,
      })
    );
    await waitFor(() => screen.getByRole('alert'));
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('lesson date input exists with name="lessonDate"', () => {
    const { container } = render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    const dateInput = container.querySelector<HTMLInputElement>(
      'input[type="date"][name="lessonDate"]'
    );
    expect(dateInput).not.toBeNull();
  });

  it('"סדרת שיעורים" series field is NOT in step 1 (field was removed from form)', () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    expect(screen.queryByText('סדרת שיעורים')).not.toBeInTheDocument();
  });

  it('type label shows "General (Thematic)" for THEMATIC and "Sequential" for SEQUENTIAL', () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    expect(screen.getByText('General (Thematic)')).toBeInTheDocument();
    expect(screen.getByText('Sequential')).toBeInTheDocument();
  });

  it('template step 3 shows THEMATIC and SEQUENTIAL template cards', async () => {
    render(
      <MemoryRouter>
        <CreateLessonPage />
      </MemoryRouter>
    );
    await advanceToStep3();
    expect(screen.getByText(/General \(Thematic\)/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Sequential/i).length
    ).toBeGreaterThanOrEqual(1);
  });
});
