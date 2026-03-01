import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { MemoryRouter } from 'react-router-dom';
import { AiCourseCreatorModal } from './AiCourseCreatorModal';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

vi.mock('@/lib/graphql/agent-course-gen.queries', () => ({
  GENERATE_COURSE_FROM_PROMPT_MUTATION: 'GENERATE_COURSE_FROM_PROMPT_MUTATION',
  EXECUTION_STATUS_SUBSCRIPTION: 'EXECUTION_STATUS_SUBSCRIPTION',
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  CREATE_COURSE_MUTATION: 'CREATE_COURSE_MUTATION',
}));

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });

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
        screen.getByText(/generation service unavailable/i)
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
    // Use a call counter so both calls during re-renders get valid arrays.
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

  it('does not render when open is false', () => {
    render(
      <MemoryRouter>
        <AiCourseCreatorModal open={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    // Dialog content should not be visible
    expect(screen.queryByText('AI Course Creator')).not.toBeInTheDocument();
  });
});
