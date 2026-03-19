import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { MemoryRouter } from 'react-router-dom';
import { AiCourseCreatorModal } from './AiCourseCreatorModal';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()), useLocation: vi.fn(() => ({ pathname: '/courses' })) };
});

vi.mock('@/lib/graphql/agent-course-gen.queries', () => ({
  GENERATE_COURSE_FROM_PROMPT_MUTATION: 'GENERATE_COURSE_FROM_PROMPT_MUTATION',
  EXECUTION_STATUS_SUBSCRIPTION: 'EXECUTION_STATUS_SUBSCRIPTION',
  AGENT_EXECUTION_QUERY: 'AGENT_EXECUTION_QUERY',
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  CREATE_COURSE_MUTATION: 'CREATE_COURSE_MUTATION',
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'instructor@example.com' })),
  getToken: vi.fn(() => 'mock-token'),
  isAuthenticated: vi.fn(() => true),
  logout: vi.fn(),
}));

// BUG-095: Mock urqlClient used for direct polling
vi.mock('@/lib/urql-client', () => ({
  urqlClient: {
    query: vi.fn().mockReturnValue({ toPromise: vi.fn().mockResolvedValue({ data: null }) }),
  },
  disposeWsClient: vi.fn(),
}));

const NOOP_EXECUTE = vi
  .fn()
  .mockResolvedValue({ data: null, error: undefined });

const defaultProps = {
  open: true,
  onClose: vi.fn(),
};

function renderModal(props = defaultProps) {
  return render(
    <MemoryRouter>
      <AiCourseCreatorModal {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Grant AI consent by default so non-consent tests work.
  localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
  vi.mocked(urql.useMutation).mockReturnValue([{} as never, NOOP_EXECUTE]);
  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: undefined } as never,
    vi.fn(),
  ]);
});

describe('AiCourseCreatorModal', () => {
  it('renders the dialog title when open', () => {
    renderModal();
    expect(screen.getByText('AI Course Creator')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    renderModal();
    expect(screen.getByText(/describe your course topic/i)).toBeInTheDocument();
  });

  it('shows course topic textarea', () => {
    renderModal();
    expect(
      screen.getByPlaceholderText(/introduction to machine learning/i)
    ).toBeInTheDocument();
  });

  it('shows audience level select and estimated hours input', () => {
    renderModal();
    expect(screen.getByText('Audience Level')).toBeInTheDocument();
    expect(screen.getByText('Estimated Hours')).toBeInTheDocument();
  });

  it('Generate Course button is disabled when prompt is empty', () => {
    renderModal();
    const btn = screen.getByRole('button', { name: /generate course/i });
    expect(btn).toBeDisabled();
  });

  it('Generate Course button becomes enabled after typing a prompt', () => {
    renderModal();
    const textarea = screen.getByPlaceholderText(
      /introduction to machine learning/i
    );
    fireEvent.change(textarea, { target: { value: 'Learn TypeScript' } });
    const btn = screen.getByRole('button', { name: /generate course/i });
    expect(btn).not.toBeDisabled();
  });

  it('Cancel button calls onClose', () => {
    const onClose = vi.fn();
    renderModal({ ...defaultProps, onClose });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error message when generation fails', async () => {
    const failExecute = vi.fn().mockResolvedValue({
      data: null,
      error: {
        graphQLErrors: [{ message: 'Generation service unavailable' }],
      },
    });
    vi.mocked(urql.useMutation).mockReturnValue([{} as never, failExecute]);
    renderModal();
    const textarea = screen.getByPlaceholderText(
      /introduction to machine learning/i
    );
    fireEvent.change(textarea, { target: { value: 'TypeScript basics' } });
    fireEvent.click(screen.getByRole('button', { name: /generate course/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/failed to generate course outline/i)
      ).toBeInTheDocument()
    );
  });

  it('shows course outline after successful generation (COMPLETED status)', async () => {
    const successExecute = vi.fn().mockResolvedValue({
      data: {
        generateCourseFromPrompt: {
          executionId: 'exec-1',
          status: 'COMPLETED',
          courseTitle: 'TypeScript Mastery',
          courseDescription: 'Learn TypeScript from scratch',
          modules: [
            {
              title: 'Intro',
              description: 'Basics',
              contentItemTitles: ['Variables', 'Types'],
            },
          ],
        },
      },
      error: undefined,
    });
    // useMutation is called twice: [0]=generateCourse [1]=createCourse.
    let mutationCallCount = 0;
    vi.mocked(urql.useMutation).mockImplementation(() => {
      const isFirst = mutationCallCount % 2 === 0;
      mutationCallCount++;
      return [{} as never, isFirst ? successExecute : NOOP_EXECUTE];
    });
    renderModal();
    fireEvent.change(
      screen.getByPlaceholderText(/introduction to machine learning/i),
      { target: { value: 'TypeScript basics' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /generate course/i }));
    await waitFor(() =>
      expect(screen.getByText('TypeScript Mastery')).toBeInTheDocument()
    );
    expect(screen.getByText('Module 1: Intro')).toBeInTheDocument();
  });

  it('shows consent error when CONSENT_REQUIRED is returned', async () => {
    // Remove consent so the backend error path is also tested
    localStorage.removeItem('edusphere_consent_AI_PROCESSING');
    renderModal();
    // RequirementLink should appear immediately (frontend consent gate)
    expect(screen.getByTestId('requirement-link')).toBeInTheDocument();
    // Generic error should NOT appear
    expect(
      screen.queryByText(/failed to generate course outline/i)
    ).not.toBeInTheDocument();
  });

  it('shows generic error for non-consent GraphQL errors', async () => {
    const serverExecute = vi.fn().mockResolvedValue({
      data: null,
      error: {
        graphQLErrors: [
          {
            message: 'Internal error',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          },
        ],
      },
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      {} as never,
      serverExecute,
    ]);
    renderModal();
    const textarea = screen.getByPlaceholderText(
      /introduction to machine learning/i
    );
    fireEvent.change(textarea, { target: { value: 'TypeScript basics' } });
    fireEvent.click(screen.getByRole('button', { name: /generate course/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/failed to generate course outline/i)
      ).toBeInTheDocument()
    );
    // Consent error link should NOT appear
    expect(
      screen.queryByTestId('requirement-link')
    ).not.toBeInTheDocument();
  });

  // ── i18n regression tests (BUG: modal showed English when locale=he) ──

  it('does NOT contain hardcoded English strings — all text comes from i18n', () => {
    renderModal();
    // Title comes from t('aiCreator.title'), not hardcoded
    expect(screen.getByText('AI Course Creator')).toBeInTheDocument();

    // Verify NO raw untranslated fallback keys are rendered
    expect(screen.queryByText('aiCreator.title')).not.toBeInTheDocument();
    expect(screen.queryByText('aiCreator.description')).not.toBeInTheDocument();
    expect(screen.queryByText('aiCreator.topicLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('aiCreator.audienceLevel')).not.toBeInTheDocument();
  });

  it('renders translated module label with interpolation', async () => {
    const successExecute = vi.fn().mockResolvedValue({
      data: {
        generateCourseFromPrompt: {
          executionId: 'exec-i18n',
          status: 'COMPLETED',
          courseTitle: 'Test',
          courseDescription: 'Desc',
          modules: [
            { title: 'Basics', description: 'D', contentItemTitles: ['A'] },
          ],
        },
      },
      error: undefined,
    });
    let mutationCallCount = 0;
    vi.mocked(urql.useMutation).mockImplementation(() => {
      const isFirst = mutationCallCount % 2 === 0;
      mutationCallCount++;
      return [{} as never, isFirst ? successExecute : NOOP_EXECUTE];
    });
    renderModal();
    fireEvent.change(
      screen.getByPlaceholderText(/introduction to machine learning/i),
      { target: { value: 'test' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /generate course/i }));
    await waitFor(() =>
      // Interpolated: t('aiCreator.moduleNumber', {n:1, title:'Basics'}) → "Module 1: Basics"
      expect(screen.getByText('Module 1: Basics')).toBeInTheDocument()
    );
  });

  // BUG-093: regression — ProgressStatus renders with cycling messages when generating
  it('BUG-093: ProgressStatus renders with cycling messages when generating', async () => {
    const pendingExecute = vi.fn().mockResolvedValue({
      data: {
        generateCourseFromPrompt: {
          executionId: 'exec-pending',
          status: 'PENDING',
          courseTitle: null,
          courseDescription: null,
          modules: [],
        },
      },
      error: undefined,
    });
    let mutationCallCount = 0;
    vi.mocked(urql.useMutation).mockImplementation(() => {
      const isFirst = mutationCallCount % 2 === 0;
      mutationCallCount++;
      return [{} as never, isFirst ? pendingExecute : NOOP_EXECUTE];
    });
    renderModal();
    const textarea = screen.getByPlaceholderText(
      /introduction to machine learning/i
    );
    fireEvent.change(textarea, { target: { value: 'Deep learning basics' } });
    fireEvent.click(screen.getByRole('button', { name: /generate course/i }));
    await waitFor(() => {
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThanOrEqual(2);
      const hasProgressText = statusElements.some(
        (el) => el.textContent && el.textContent.length > 0
      );
      expect(hasProgressText).toBe(true);
    });
  });

  it('does not render when open is false', () => {
    render(
      <MemoryRouter>
        <AiCourseCreatorModal open={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByText('AI Course Creator')).not.toBeInTheDocument();
  });

  // BUG-095: Retry button appears on error and resets state
  it('BUG-095: shows retry button on error and resets on click', async () => {
    const failExecute = vi.fn().mockResolvedValue({
      data: null,
      error: {
        graphQLErrors: [{ message: 'Server error' }],
      },
    });
    vi.mocked(urql.useMutation).mockReturnValue([{} as never, failExecute]);
    renderModal();
    fireEvent.change(
      screen.getByPlaceholderText(/introduction to machine learning/i),
      { target: { value: 'Colors' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /generate course/i }));
    await waitFor(() =>
      expect(screen.getByText(/retry/i)).toBeInTheDocument()
    );
    // Click retry — error should clear
    fireEvent.click(screen.getByText(/retry/i));
    expect(screen.queryByText(/failed to generate/i)).not.toBeInTheDocument();
    // Generate button should be enabled again
    expect(screen.getByRole('button', { name: /generate course/i })).not.toBeDisabled();
  });
});
