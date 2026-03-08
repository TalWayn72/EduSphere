/**
 * LessonPipelineBuilderPage tests — Phase 36 WYSIWYG lesson authoring builder.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ courseId: 'course-abc' })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

let mockRole: string | null = 'INSTRUCTOR';
vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => mockRole),
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => <div data-testid="layout">{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/graphql/lesson-plan.queries', () => ({
  MY_COURSE_LESSON_PLANS_QUERY: 'MY_COURSE_LESSON_PLANS_QUERY',
  CREATE_LESSON_PLAN_MUTATION: 'CREATE_LESSON_PLAN_MUTATION',
  ADD_LESSON_STEP_MUTATION: 'ADD_LESSON_STEP_MUTATION',
  REORDER_LESSON_STEPS_MUTATION: 'REORDER_LESSON_STEPS_MUTATION',
  PUBLISH_LESSON_PLAN_MUTATION: 'PUBLISH_LESSON_PLAN_MUTATION',
}));

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

// ── Imports after mocks ───────────────────────────────────────────────────────

import { LessonPipelineBuilderPage } from './LessonPipelineBuilderPage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });
const NOOP_MUTATION = [{ fetching: false }, NOOP_EXECUTE] as never;

const EMPTY_PLANS_QUERY = [
  { data: { myCourseLessonPlans: [] }, fetching: false, error: undefined },
  vi.fn(),
] as never;

const PLAN_WITH_STEPS_QUERY = [
  {
    data: {
      myCourseLessonPlans: [
        {
          id: 'plan-1',
          courseId: 'course-abc',
          title: 'Test Plan',
          status: 'DRAFT',
          steps: [
            { id: 's1', stepType: 'VIDEO', stepOrder: 0, config: {} },
            { id: 's2', stepType: 'QUIZ', stepOrder: 1, config: {} },
          ],
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    },
    fetching: false,
    error: undefined,
  },
  vi.fn(),
] as never;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonPipelineBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'INSTRUCTOR';
    vi.mocked(urql.useQuery).mockReturnValue(EMPTY_PLANS_QUERY);
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders builder heading for instructor role', () => {
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('builder-heading')).toHaveTextContent(
      'Lesson Pipeline Builder'
    );
  });

  it('renders all 5 step type buttons', () => {
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('add-step-VIDEO')).toBeInTheDocument();
    expect(screen.getByTestId('add-step-QUIZ')).toBeInTheDocument();
    expect(screen.getByTestId('add-step-DISCUSSION')).toBeInTheDocument();
    expect(screen.getByTestId('add-step-AI_CHAT')).toBeInTheDocument();
    expect(screen.getByTestId('add-step-SUMMARY')).toBeInTheDocument();
  });

  it('renders Save Draft button', () => {
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('save-draft-btn')).toBeInTheDocument();
  });

  it('renders Publish button', () => {
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('publish-btn')).toBeInTheDocument();
  });

  it('shows empty state when no steps', () => {
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('empty-steps')).toBeInTheDocument();
  });

  it('clicking VIDEO button triggers createPlan then addStep', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        createLessonPlan: {
          id: 'new-plan-1',
          courseId: 'course-abc',
          title: 'New Lesson Plan',
          status: 'DRAFT',
          steps: [],
          createdAt: '2026-01-01T00:00:00Z',
        },
      },
      error: undefined,
    });
    const mockAdd = vi.fn().mockResolvedValue({
      data: {
        addLessonStep: {
          id: 'new-plan-1',
          title: 'New Lesson Plan',
          status: 'DRAFT',
          steps: [{ id: 's1', stepType: 'VIDEO', stepOrder: 0, config: {} }],
        },
      },
      error: undefined,
    });

    vi.mocked(urql.useMutation).mockImplementation((doc: unknown) => {
      if (String(doc).includes('CREATE_LESSON_PLAN_MUTATION'))
        return [{ fetching: false }, mockCreate] as never;
      if (String(doc).includes('ADD_LESSON_STEP_MUTATION'))
        return [{ fetching: false }, mockAdd] as never;
      return NOOP_MUTATION;
    });

    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId('add-step-VIDEO'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith({
      input: { planId: 'new-plan-1', stepType: 'VIDEO', config: {} },
    }));
  });

  it('shows VIDEO step in list after adding', async () => {
    vi.mocked(urql.useQuery).mockReturnValue(PLAN_WITH_STEPS_QUERY);
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    const stepList = screen.getByTestId('step-list');
    expect(stepList).toBeInTheDocument();
    expect(screen.getByTestId('step-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('step-item-1')).toBeInTheDocument();
  });

  it('student role is redirected (no builder rendered)', async () => {
    mockRole = 'STUDENT';
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/courses');
    });
  });

  it('Publish button is disabled when no steps', () => {
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('publish-btn')).toBeDisabled();
  });

  it('Publish button is enabled when steps exist', () => {
    vi.mocked(urql.useQuery).mockReturnValue(PLAN_WITH_STEPS_QUERY);
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('publish-btn')).not.toBeDisabled();
  });

  it('action buttons container is present', () => {
    render(
      <MemoryRouter>
        <LessonPipelineBuilderPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
  });
});
